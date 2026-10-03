use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{FromSample, Sample, SampleFormat, SizedSample, Stream, StreamConfig};
use ringbuf::{traits::*, HeapRb};
use serde::Serialize;
use std::sync::{
    atomic::{AtomicBool, AtomicU32, Ordering},
    Arc, Mutex,
};

const MAX_DELAY_SECONDS: f32 = 0.12;
const RING_SECONDS: f32 = 0.25;

fn atomic_f32(value: f32) -> AtomicU32 {
    AtomicU32::new(value.to_bits())
}
fn load_f32(v: &AtomicU32) -> f32 {
    f32::from_bits(v.load(Ordering::Relaxed))
}
fn store_f32(v: &AtomicU32, value: f32) {
    v.store(value.to_bits(), Ordering::Relaxed);
}

#[derive(Clone)]
pub struct AudioParams {
    pub rate_hz: Arc<AtomicU32>,
    pub depth_ms: Arc<AtomicU32>,
    pub delay_ms: Arc<AtomicU32>,
    pub feedback: Arc<AtomicU32>,
    pub mix: Arc<AtomicU32>,
    pub reverb: Arc<AtomicU32>,
    pub output_db: Arc<AtomicU32>,
    pub enabled: Arc<AtomicBool>,
    pub monitoring: Arc<AtomicBool>,
}

impl Default for AudioParams {
    fn default() -> Self {
        Self {
            rate_hz: Arc::new(atomic_f32(0.65)),
            depth_ms: Arc::new(atomic_f32(5.0)),
            delay_ms: Arc::new(atomic_f32(8.0)),
            feedback: Arc::new(atomic_f32(0.22)),
            mix: Arc::new(atomic_f32(0.50)),
            reverb: Arc::new(atomic_f32(0.12)),
            output_db: Arc::new(atomic_f32(-3.0)),
            enabled: Arc::new(AtomicBool::new(true)),
            monitoring: Arc::new(AtomicBool::new(true)),
        }
    }
}

#[derive(Clone, Serialize)]
pub struct AudioDevice {
    pub id: String,
    pub name: String,
    pub kind: String,
}

#[derive(Clone, Serialize)]
pub struct DeviceList {
    pub inputs: Vec<AudioDevice>,
    pub outputs: Vec<AudioDevice>,
}

#[derive(Clone, Serialize)]
pub struct AudioStatus {
    pub running: bool,
    pub input: String,
    pub output: String,
    pub sample_rate: u32,
    pub input_peak: f32,
    pub output_peak: f32,
}

struct Meter {
    input_peak: Arc<AtomicU32>,
    output_peak: Arc<AtomicU32>,
}

impl Default for Meter {
    fn default() -> Self {
        Self {
            input_peak: Arc::new(atomic_f32(0.0)),
            output_peak: Arc::new(atomic_f32(0.0)),
        }
    }
}

struct EngineState {
    input_stream: Option<Stream>,
    output_stream: Option<Stream>,
    params: AudioParams,
    meter: Meter,
    input_name: String,
    output_name: String,
    sample_rate: u32,
}

#[derive(Clone)]
pub struct AudioEngine {
    inner: Arc<Mutex<EngineState>>,
}

impl Default for AudioEngine {
    fn default() -> Self {
        Self {
            inner: Arc::new(Mutex::new(EngineState {
                input_stream: None,
                output_stream: None,
                params: AudioParams::default(),
                meter: Meter::default(),
                input_name: String::new(),
                output_name: String::new(),
                sample_rate: 0,
            })),
        }
    }
}

impl AudioEngine {
    pub fn devices() -> Result<DeviceList, String> {
        let host = cpal::default_host();
        let mut inputs = Vec::new();
        let mut outputs = Vec::new();

        for (index, device) in host.input_devices().map_err(|e| e.to_string())?.enumerate() {
            let name = device
                .description()
                .map(|d| d.to_string())
                .unwrap_or_else(|_| "Unknown input".into());
            inputs.push(AudioDevice {
                id: format!("in-{index}-{name}"),
                name,
                kind: "input".into(),
            });
        }

        for (index, device) in host.output_devices().map_err(|e| e.to_string())?.enumerate() {
            let name = device
                .description()
                .map(|d| d.to_string())
                .unwrap_or_else(|_| "Unknown output".into());
            outputs.push(AudioDevice {
                id: format!("out-{index}-{name}"),
                name,
                kind: "output".into(),
            });
        }

        Ok(DeviceList { inputs, outputs })
    }

    fn find_input(name: &str) -> Result<cpal::Device, String> {
        let host = cpal::default_host();
        if name.is_empty() {
            return host
                .default_input_device()
                .ok_or_else(|| "No default input device is available.".into());
        }
        for device in host.input_devices().map_err(|e| e.to_string())? {
            let device_name = device
                .description()
                .map(|d| d.to_string())
                .unwrap_or_default();
            if device_name == name {
                return Ok(device);
            }
        }
        Err(format!("Input device not found: {name}"))
    }

    fn find_output(name: &str) -> Result<cpal::Device, String> {
        let host = cpal::default_host();
        if name.is_empty() {
            return host
                .default_output_device()
                .ok_or_else(|| "No default output device is available.".into());
        }
        for device in host.output_devices().map_err(|e| e.to_string())? {
            let device_name = device
                .description()
                .map(|d| d.to_string())
                .unwrap_or_default();
            if device_name == name {
                return Ok(device);
            }
        }
        Err(format!("Output device not found: {name}"))
    }

    pub fn start(&self, input_name: String, output_name: String) -> Result<AudioStatus, String> {
        self.stop()?;

        let input = Self::find_input(&input_name)?;
        let output = Self::find_output(&output_name)?;

        let input_supported = input.default_input_config().map_err(|e| e.to_string())?;
        let output_supported = output.default_output_config().map_err(|e| e.to_string())?;

        let input_rate = input_supported.sample_rate();
        let output_rate = output_supported.sample_rate();
        if input_rate != output_rate {
            return Err(format!(
                "Input and output sample rates differ ({input_rate} Hz vs {output_rate} Hz). Choose devices using the same sample rate."
            ));
        }

        let input_channels = input_supported.channels() as usize;
        let output_channels = output_supported.channels() as usize;
        let sample_rate = input_rate;

        let capacity = (sample_rate as f32 * RING_SECONDS) as usize;
        let rb = HeapRb::<f32>::new(capacity.max(4096));
        let (mut producer, mut consumer) = rb.split();

        let params = {
            let state = self.inner.lock().map_err(|_| "Audio state lock poisoned.")?;
            state.params.clone()
        };
        let input_peak = {
            let state = self.inner.lock().map_err(|_| "Audio state lock poisoned.")?;
            state.meter.input_peak.clone()
        };

        let input_config: StreamConfig = input_supported.clone().into();
        let output_config: StreamConfig = output_supported.clone().into();

        let input_error = |err| eprintln!("Spiral Mic input stream error: {err}");
        let output_error = |err| eprintln!("Spiral Mic output stream error: {err}");

        let input_stream = match input_supported.sample_format() {
            SampleFormat::F32 => build_input::<f32>(
                &input,
                input_config,
                input_channels,
                producer,
                input_error,
                input_peak.clone(),
            )?,
            SampleFormat::F64 => build_input::<f64>(
                &input,
                input_config,
                input_channels,
                producer,
                input_error,
                input_peak.clone(),
            )?,
            SampleFormat::I8 => build_input::<i8>(
                &input,
                input_config,
                input_channels,
                producer,
                input_error,
                input_peak.clone(),
            )?,
            SampleFormat::I16 => build_input::<i16>(
                &input,
                input_config,
                input_channels,
                producer,
                input_error,
                input_peak.clone(),
            )?,
            SampleFormat::I24 => build_input::<cpal::I24>(
                &input,
                input_config,
                input_channels,
                producer,
                input_error,
                input_peak.clone(),
            )?,
            SampleFormat::I32 => build_input::<i32>(
                &input,
                input_config,
                input_channels,
                producer,
                input_error,
                input_peak.clone(),
            )?,
            SampleFormat::I64 => build_input::<i64>(
                &input,
                input_config,
                input_channels,
                producer,
                input_error,
                input_peak.clone(),
            )?,
            SampleFormat::U8 => build_input::<u8>(
                &input,
                input_config,
                input_channels,
                producer,
                input_error,
                input_peak.clone(),
            )?,
            SampleFormat::U16 => build_input::<u16>(
                &input,
                input_config,
                input_channels,
                producer,
                input_error,
                input_peak.clone(),
            )?,
            SampleFormat::U24 => build_input::<cpal::U24>(
                &input,
                input_config,
                input_channels,
                producer,
                input_error,
                input_peak.clone(),
            )?,
            SampleFormat::U32 => build_input::<u32>(
                &input,
                input_config,
                input_channels,
                producer,
                input_error,
                input_peak.clone(),
            )?,
            SampleFormat::U64 => build_input::<u64>(
                &input,
                input_config,
                input_channels,
                producer,
                input_error,
                input_peak.clone(),
            )?,
            unsupported => return Err(format!("Unsupported input sample format: {unsupported:?}")),
        };

        let output_meter = {
            let state = self.inner.lock().map_err(|_| "Audio state lock poisoned.")?;
            state.meter.output_peak.clone()
        };

        let output_stream = match output_supported.sample_format() {
            SampleFormat::F32 => build_output::<f32>(
                &output,
                output_config,
                output_channels,
                consumer,
                params.clone(),
                sample_rate,
                output_meter,
                output_error,
            )?,
            SampleFormat::F64 => build_output::<f64>(
                &output,
                output_config,
                output_channels,
                consumer,
                params.clone(),
                sample_rate,
                output_meter,
                output_error,
            )?,
            SampleFormat::I8 => build_output::<i8>(
                &output,
                output_config,
                output_channels,
                consumer,
                params.clone(),
                sample_rate,
                output_meter,
                output_error,
            )?,
            SampleFormat::I16 => build_output::<i16>(
                &output,
                output_config,
                output_channels,
                consumer,
                params.clone(),
                sample_rate,
                output_meter,
                output_error,
            )?,
            SampleFormat::I24 => build_output::<cpal::I24>(
                &output,
                output_config,
                output_channels,
                consumer,
                params.clone(),
                sample_rate,
                output_meter,
                output_error,
            )?,
            SampleFormat::I32 => build_output::<i32>(
                &output,
                output_config,
                output_channels,
                consumer,
                params.clone(),
                sample_rate,
                output_meter,
                output_error,
            )?,
            SampleFormat::I64 => build_output::<i64>(
                &output,
                output_config,
                output_channels,
                consumer,
                params.clone(),
                sample_rate,
                output_meter,
                output_error,
            )?,
            SampleFormat::U8 => build_output::<u8>(
                &output,
                output_config,
                output_channels,
                consumer,
                params.clone(),
                sample_rate,
                output_meter,
                output_error,
            )?,
            SampleFormat::U16 => build_output::<u16>(
                &output,
                output_config,
                output_channels,
                consumer,
                params.clone(),
                sample_rate,
                output_meter,
                output_error,
            )?,
            SampleFormat::U24 => build_output::<cpal::U24>(
                &output,
                output_config,
                output_channels,
                consumer,
                params.clone(),
                sample_rate,
                output_meter,
                output_error,
            )?,
            SampleFormat::U32 => build_output::<u32>(
                &output,
                output_config,
                output_channels,
                consumer,
                params.clone(),
                sample_rate,
                output_meter,
                output_error,
            )?,
            SampleFormat::U64 => build_output::<u64>(
                &output,
                output_config,
                output_channels,
                consumer,
                params,
                sample_rate,
                output_meter,
                output_error,
            )?,
            unsupported => return Err(format!("Unsupported output sample format: {unsupported:?}")),
        };

        input_stream.play().map_err(|e| e.to_string())?;
        output_stream.play().map_err(|e| e.to_string())?;

        let mut state = self.inner.lock().map_err(|_| "Audio state lock poisoned.")?;
        state.input_stream = Some(input_stream);
        state.output_stream = Some(output_stream);
        state.input_name = if input_name.is_empty() {
            input.description().map(|d| d.to_string()).unwrap_or_default()
        } else {
            input_name
        };
        state.output_name = if output_name.is_empty() {
            output.description().map(|d| d.to_string()).unwrap_or_default()
        } else {
            output_name
        };
        state.sample_rate = sample_rate;

        Ok(Self::status_locked(&state))
    }

    pub fn stop(&self) -> Result<(), String> {
        let mut state = self.inner.lock().map_err(|_| "Audio state lock poisoned.")?;
        state.input_stream.take();
        state.output_stream.take();
        state.sample_rate = 0;
        Ok(())
    }

    pub fn set_params(&self, rate_hz: f32, depth_ms: f32, delay_ms: f32, feedback: f32, mix: f32, reverb: f32, output_db: f32, enabled: bool, monitoring: bool) -> Result<(), String> {
        let state = self.inner.lock().map_err(|_| "Audio state lock poisoned.")?;
        store_f32(&state.params.rate_hz, rate_hz.clamp(0.02, 8.0));
        store_f32(&state.params.depth_ms, depth_ms.clamp(0.1, 30.0));
        store_f32(&state.params.delay_ms, delay_ms.clamp(1.0, 35.0));
        store_f32(&state.params.feedback, feedback.clamp(0.0, 0.75));
        store_f32(&state.params.mix, mix.clamp(0.0, 1.0));
        store_f32(&state.params.reverb, reverb.clamp(0.0, 0.45));
        store_f32(&state.params.output_db, output_db.clamp(-24.0, 6.0));
        state.params.enabled.store(enabled, Ordering::Relaxed);
        state.params.monitoring.store(monitoring, Ordering::Relaxed);
        Ok(())
    }

    pub fn status(&self) -> Result<AudioStatus, String> {
        let state = self.inner.lock().map_err(|_| "Audio state lock poisoned.")?;
        Ok(Self::status_locked(&state))
    }

    fn status_locked(state: &EngineState) -> AudioStatus {
        AudioStatus {
            running: state.input_stream.is_some() && state.output_stream.is_some(),
            input: state.input_name.clone(),
            output: state.output_name.clone(),
            sample_rate: state.sample_rate,
            input_peak: load_f32(&state.meter.input_peak),
            output_peak: load_f32(&state.meter.output_peak),
        }
    }
}

fn build_input<T>(
    device: &cpal::Device,
    config: StreamConfig,
    channels: usize,
    mut producer: impl Producer<Item = f32> + Send + 'static,
    error_fn: impl Fn(cpal::Error) + Send + 'static,
    meter: Arc<AtomicU32>,
) -> Result<Stream, String>
where
    T: SizedSample + Copy,
    f32: FromSample<T>,
{
    let stream = device
        .build_input_stream(
            config,
            move |data: &[T], _| {
                let mut peak = 0.0_f32;
                for frame in data.chunks(channels) {
                    let mut mono = 0.0;
                    for sample in frame {
                        mono += f32::from_sample(*sample);
                    }
                    mono /= channels.max(1) as f32;
                    peak = peak.max(mono.abs());
                    let _ = producer.try_push(mono);
                }
                store_f32(&meter, peak);
            },
            error_fn,
            None,
        )
        .map_err(|e| e.to_string())?;
    Ok(stream)
}

fn build_output<T>(
    device: &cpal::Device,
    config: StreamConfig,
    channels: usize,
    mut consumer: impl Consumer<Item = f32> + Send + 'static,
    params: AudioParams,
    sample_rate: u32,
    meter: Arc<AtomicU32>,
    error_fn: impl Fn(cpal::Error) + Send + 'static,
) -> Result<Stream, String>
where
    T: SizedSample + FromSample<f32> + Copy,
    f32: FromSample<T>,
{
    let mut processor = SpiralProcessor::new(sample_rate as f32);

    let stream = device
        .build_output_stream(
            config,
            move |data: &mut [T], _| {
                let mut peak = 0.0_f32;
                for frame in data.chunks_mut(channels) {
                    let input = consumer.try_pop().unwrap_or(0.0);
                    let (mut left, mut right) = if params.enabled.load(Ordering::Relaxed) {
                        processor.process(input, &params)
                    } else {
                        (input, input)
                    };

                    if !params.monitoring.load(Ordering::Relaxed) {
                        left = 0.0;
                        right = 0.0;
                    }

                    let gain = 10.0_f32.powf(load_f32(&params.output_db) / 20.0);
                    left = (left * gain).tanh();
                    right = (right * gain).tanh();
                    peak = peak.max(left.abs()).max(right.abs());

                    for (index, sample) in frame.iter_mut().enumerate() {
                        let value = if index & 1 == 0 { left } else { right };
                        *sample = f32::to_sample(value);
                    }
                }
                store_f32(&meter, peak);
            },
            error_fn,
            None,
        )
        .map_err(|e| e.to_string())?;

    Ok(stream)
}

struct SpiralProcessor {
    sample_rate: f32,
    delay: Vec<f32>,
    reverb: Vec<f32>,
    write: usize,
    reverb_write: usize,
    phase: f32,
    feedback_state: f32,
    reverb_state: f32,
}

impl SpiralProcessor {
    fn new(sample_rate: f32) -> Self {
        let delay_size = (sample_rate * MAX_DELAY_SECONDS) as usize + 8;
        let reverb_size = (sample_rate * 0.20) as usize + 8;
        Self {
            sample_rate,
            delay: vec![0.0; delay_size],
            reverb: vec![0.0; reverb_size],
            write: 0,
            reverb_write: 0,
            phase: 0.0,
            feedback_state: 0.0,
            reverb_state: 0.0,
        }
    }

    fn read_frac(buffer: &[f32], write: usize, delay_samples: f32) -> f32 {
        let len = buffer.len();
        let position = (write as f32 - delay_samples).rem_euclid(len as f32);
        let a_index = position.floor() as usize % len;
        let b_index = (a_index + 1) % len;
        let frac = position - a_index as f32;
        buffer[a_index] * (1.0 - frac) + buffer[b_index] * frac
    }

    fn process(&mut self, input: f32, params: &AudioParams) -> (f32, f32) {
        let rate = load_f32(&params.rate_hz);
        let depth = load_f32(&params.depth_ms);
        let base_delay = load_f32(&params.delay_ms);
        let feedback = load_f32(&params.feedback);
        let mix = load_f32(&params.mix);
        let reverb_mix = load_f32(&params.reverb);

        self.phase = (self.phase + rate / self.sample_rate).rem_euclid(1.0);
        let a = (self.phase * std::f32::consts::TAU).sin();
        let b = ((self.phase + 0.25) * std::f32::consts::TAU).sin();

        let left_delay = ((base_delay + depth * a) * self.sample_rate / 1000.0)
            .clamp(1.0, (self.delay.len() - 3) as f32);
        let right_delay = ((base_delay + depth * b) * self.sample_rate / 1000.0)
            .clamp(1.0, (self.delay.len() - 3) as f32);

        let left = Self::read_frac(&self.delay, self.write, left_delay);
        let right = Self::read_frac(&self.delay, self.write, right_delay);

        let feedback_input = ((left + right) * 0.5).clamp(-0.95, 0.95);
        let write_value = (input + feedback_input * feedback).clamp(-1.0, 1.0);
        self.delay[self.write] = write_value;
        self.write = (self.write + 1) % self.delay.len();

        let reverb_tap = Self::read_frac(&self.reverb, self.reverb_write, self.sample_rate * 0.082);
        let reverb_write = (input * 0.32 + reverb_tap * 0.42).clamp(-1.0, 1.0);
        self.reverb[self.reverb_write] = reverb_write;
        self.reverb_write = (self.reverb_write + 1) % self.reverb.len();

        self.feedback_state = self.feedback_state * 0.995 + feedback_input * 0.005;
        self.reverb_state = self.reverb_state * 0.997 + reverb_tap * 0.003;

        let dry = input;
        let wet_left = left + reverb_tap * reverb_mix;
        let wet_right = right - reverb_tap * reverb_mix;
        let out_left = dry * (1.0 - mix) + wet_left * mix;
        let out_right = dry * (1.0 - mix) + wet_right * mix;

        (out_left, out_right)
    }
}

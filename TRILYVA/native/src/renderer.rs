use rquickjs::{Context, Runtime};
use serde_json::Value;
use std::{
    fmt::Display,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
    time::{Duration, Instant},
};
use tiny_skia::{BlendMode, FillRule, Paint, PathBuilder, Pixmap, Stroke, Transform};

const SCRIPT_MEMORY_LIMIT: usize = 64 * 1024 * 1024;
const SCRIPT_STACK_LIMIT: usize = 256 * 1024;
const SCRIPT_TIME_BUDGET: Duration = Duration::from_millis(250);
const MAX_SOURCE_BYTES: usize = 1_000_000;
const MAX_FRAME_COMMAND_BYTES: usize = 16 * 1024 * 1024;
const MAX_FRAME_COMMANDS: usize = 100_000;
const MAX_OUTPUT_PIXELS: u64 = 100_000_000;

const BRIDGE: &str = r###"
globalThis.window = globalThis;
globalThis.__trilyvaCommands = [];
globalThis.__trilyvaFrame = (function () {
  let path = [];
  let matrix = [1, 0, 0, 1, 0, 0];
  let stack = [];
  const commands = globalThis.__trilyvaCommands;
  const ctx = {
    canvas: { width: 640, height: 360 },
    fillStyle: "#ffffff",
    strokeStyle: "#ffffff",
    lineWidth: 1,
    globalAlpha: 1,
    lineCap: "butt",
    lineJoin: "miter",
    font: "16px sans-serif",
    textAlign: "start",
    textBaseline: "alphabetic"
  };
  const point = (x, y) => ({
    x: matrix[0] * x + matrix[2] * y + matrix[4],
    y: matrix[1] * x + matrix[3] * y + matrix[5]
  });
  const multiply = (b) => {
    const a = matrix;
    matrix = [
      a[0] * b[0] + a[2] * b[1],
      a[1] * b[0] + a[3] * b[1],
      a[0] * b[2] + a[2] * b[3],
      a[1] * b[2] + a[3] * b[3],
      a[0] * b[4] + a[2] * b[5] + a[4],
      a[1] * b[4] + a[3] * b[5] + a[5]
    ];
  };
  const cloneStyle = () => ({
    fillStyle: ctx.fillStyle, strokeStyle: ctx.strokeStyle,
    lineWidth: ctx.lineWidth, globalAlpha: ctx.globalAlpha,
    lineCap: ctx.lineCap, lineJoin: ctx.lineJoin,
    lineDash: ctx.__lineDash || []
  });
  const emitPath = (op, p, style) => commands.push({
    op, path: p, fill: style.fillStyle, stroke: style.strokeStyle,
    width: style.lineWidth, alpha: style.globalAlpha,
    lineCap: style.lineCap, lineJoin: style.lineJoin,
    lineDash: style.lineDash
  });
  const pathPoint = (op, p) => path.push(Object.assign({ op }, p));
  function beginPath() { path = []; }
  function moveTo(x, y) { pathPoint("M", point(x, y)); }
  function lineTo(x, y) { pathPoint("L", point(x, y)); }
  function bezierCurveTo(x1, y1, x2, y2, x, y) {
    const a = point(x1, y1), b = point(x2, y2), c = point(x, y);
    pathPoint("C", { x1: a.x, y1: a.y, x2: b.x, y2: b.y, x: c.x, y: c.y });
  }
  function quadraticCurveTo(x1, y1, x, y) {
    const previous = path.length ? path[path.length - 1] : { x: 0, y: 0 };
    const control = point(x1, y1), end = point(x, y);
    const c1 = { x: previous.x + (control.x - previous.x) * 2 / 3, y: previous.y + (control.y - previous.y) * 2 / 3 };
    const c2 = { x: end.x + (control.x - end.x) * 2 / 3, y: end.y + (control.y - end.y) * 2 / 3 };
    pathPoint("C", { x1: c1.x, y1: c1.y, x2: c2.x, y2: c2.y, x: end.x, y: end.y });
  }
  function closePath() { pathPoint("Z", {}); }
  function rect(x, y, w, h) {
    moveTo(x, y); lineTo(x + w, y); lineTo(x + w, y + h); lineTo(x, y + h); closePath();
  }
  function arc(x, y, radius, start, end, anticlockwise) {
    const r = Math.abs(Number(radius));
    if (!Number.isFinite(r) || r === 0) return;
    let delta = end - start;
    if (!anticlockwise) {
      while (delta < 0) delta += Math.PI * 2;
      delta = Math.min(delta, Math.PI * 2);
    } else {
      while (delta > 0) delta -= Math.PI * 2;
      delta = Math.max(delta, -Math.PI * 2);
    }
    const steps = Math.max(8, Math.min(256, Math.ceil(Math.abs(delta) * Math.sqrt(r) * 1.2)));
    for (let i = 0; i <= steps; i++) {
      const angle = start + delta * i / steps;
      const px = point(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
      if (i === 0 && !path.length) pathPoint("M", px);
      else pathPoint(i === 0 ? "M" : "L", px);
    }
  }
  function emitRect(x, y, w, h, op) {
    const p = [];
    const a = point(x, y), b = point(x + w, y), c = point(x + w, y + h), d = point(x, y + h);
    p.push(Object.assign({ op: "M" }, a), Object.assign({ op: "L" }, b), Object.assign({ op: "L" }, c), Object.assign({ op: "L" }, d), { op: "Z" });
    emitPath(op, p, cloneStyle());
  }
  Object.assign(ctx, {
    beginPath,
    moveTo, lineTo, bezierCurveTo, quadraticCurveTo, closePath, rect,
    arc,
    fill: function () { emitPath("fill", path.slice(), cloneStyle()); },
    stroke: function () { emitPath("stroke", path.slice(), cloneStyle()); },
    fillRect: function (x, y, w, h) { emitRect(x, y, w, h, "fill"); },
    strokeRect: function (x, y, w, h) { emitRect(x, y, w, h, "stroke"); },
    clearRect: function (x, y, w, h) { emitRect(x, y, w, h, "clear"); },
    save: function () { stack.push({ matrix: matrix.slice(), style: cloneStyle() }); },
    restore: function () {
      const item = stack.pop();
      if (!item) return;
      matrix = item.matrix;
      Object.assign(ctx, item.style);
    },
    translate: function (x, y) { multiply([1, 0, 0, 1, x, y]); },
    scale: function (x, y) { multiply([x, 0, 0, y, 0, 0]); },
    rotate: function (angle) {
      const c = Math.cos(angle), s = Math.sin(angle);
      multiply([c, s, -s, c, 0, 0]);
    },
    transform: function (a, b, c, d, e, f) { multiply([a, b, c, d, e, f]); },
    setTransform: function (a, b, c, d, e, f) {
      if (typeof a === "object") matrix = [a.a, a.b, a.c, a.d, a.e, a.f];
      else matrix = [a, b, c, d, e, f];
    },
    resetTransform: function () { matrix = [1, 0, 0, 1, 0, 0]; },
    createLinearGradient: function (x0, y0, x1, y1) {
      const stops = [];
      return {
        __trilyvaGradient: "linear", x0, y0, x1, y1, stops,
        addColorStop: function (offset, color) { stops.push({ offset, color }); }
      };
    },
    measureText: function (text) { return { width: String(text).length * 8, actualBoundingBoxAscent: 12, actualBoundingBoxDescent: 3 }; },
    fillText: function (text, x, y) { commands.push({ op: "text", text: String(text), x: point(x, y).x, y: point(x, y).y, fill: ctx.fillStyle, alpha: ctx.globalAlpha, font: ctx.font }); },
    strokeText: function (text, x, y) { commands.push({ op: "text", text: String(text), x: point(x, y).x, y: point(x, y).y, stroke: ctx.strokeStyle, width: ctx.lineWidth, alpha: ctx.globalAlpha, font: ctx.font }); },
    setLineDash: function (segments) { ctx.__lineDash = Array.isArray(segments) ? segments.slice() : []; },
    getLineDash: function () { return ctx.__lineDash || []; }
  });
  function reset(w, h, seed) {
    commands.length = 0;
    path = [];
    matrix = [1, 0, 0, 1, 0, 0];
    stack = [];
    ctx.canvas = { width: w, height: h };
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.globalAlpha = 1;
    ctx.lineCap = "butt";
    ctx.lineJoin = "miter";
    ctx.__lineDash = [];
    ctx.font = "16px sans-serif";
    let randomState = ((Number(seed) >>> 0) ^ 0x9e3779b9) >>> 0;
    Math.random = function () {
      randomState = (randomState + 0x6D2B79F5) >>> 0;
      let value = randomState;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }
  return { ctx, beginFrame: reset };
})();
globalThis.TAU = Math.PI * 2;
globalThis.PI = Math.PI;
globalThis.Date = undefined;
globalThis.performance = undefined;
globalThis.lerp = (a, b, t) => a + (b - a) * t;
globalThis.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
globalThis.map = (v, a, b, c, d) => c + ((v - a) / (b - a || 1)) * (d - c);
globalThis.mix = globalThis.lerp;
globalThis.smoothstep = (a, b, x) => { x = clamp((x - a) / (b - a || 1), 0, 1); return x * x * (3 - 2 * x); };
globalThis.smootherstep = (a, b, x) => { x = clamp((x - a) / (b - a || 1), 0, 1); return x * x * x * (x * (x * 6 - 15) + 10); };
globalThis.wrap = (v, a, b) => ((v - a) % (b - a) + (b - a)) % (b - a) + a;
globalThis.pingpong = (v, length) => length - Math.abs(((v % (length * 2)) + length * 2) % (length * 2) - length);
globalThis.random = (seed) => { let x = Math.sin(Number(seed) * 127.1 + 311.7) * 43758.5453123; return x - Math.floor(x); };
globalThis.randomRange = (a, b, seed) => a + random(seed === undefined ? 1 : seed) * (b - a);
globalThis.randomInt = (a, b, seed) => Math.floor(randomRange(a, b + 1, seed));
globalThis.pick = (items, seed) => items[Math.floor(random(seed === undefined ? 1 : seed) * items.length)];
globalThis.ease = { linear: t => t, inQuad: t => t*t, outQuad: t => t*(2-t), inOutQuad: t => t<.5?2*t*t:-1+(4-2*t)*t, outCubic: t => 1-Math.pow(1-t,3), inOutCubic: t => t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2 };
"###;

pub const STARTER_CODE: &str = r###"window.renderFrame = function (time, frame, fps, ctx, width, height) {
  ctx.fillStyle = "#070708";
  ctx.fillRect(0, 0, width, height);

  var cx = width * 0.5;
  var cy = height * 0.5;
  var orbit = Math.min(width, height) * 0.23;
  var angle = time * 1.8;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle * 0.2);
  ctx.strokeStyle = "rgba(255,255,255,0.24)";
  ctx.lineWidth = Math.max(1, width / 900);
  ctx.beginPath();
  ctx.arc(0, 0, orbit * 1.28, 0, Math.PI * 2);
  ctx.stroke();

  for (var i = 0; i < 7; i++) {
    var a = angle + i * Math.PI * 2 / 7;
    var x = Math.cos(a) * orbit;
    var y = Math.sin(a) * orbit * 0.72;
    ctx.fillStyle = i % 2 ? "#ededf0" : "#ffffff";
    ctx.beginPath();
    ctx.arc(x, y, Math.min(width, height) * (0.018 + 0.008 * Math.sin(time * 2 + i)), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(cx, cy, Math.min(width, height) * 0.055, 0, Math.PI * 2);
  ctx.fill();
};"###;

#[derive(Debug, thiserror::Error)]
pub enum RenderError {
    #[error("JavaScript engine: {0}")]
    Script(String),
    #[error("Canvas command stream: {0}")]
    Commands(String),
    #[error("Could not allocate a {0}×{1} frame")]
    Dimensions(u32, u32),
    #[error("Rasterizer: {0}")]
    Raster(String),
    #[error("JavaScript exceeded its {0} ms execution budget")]
    ExecutionBudget(u64),
    #[error("JavaScript source exceeds the {0} byte safety limit")]
    SourceTooLarge(usize),
}

pub struct FrameRenderer {
    runtime: Runtime,
    deadline: Arc<Mutex<Instant>>,
    interrupted: Arc<AtomicBool>,
    source: String,
}

impl FrameRenderer {
    pub fn new(source: &str) -> Result<Self, RenderError> {
        if source.len() > MAX_SOURCE_BYTES {
            return Err(RenderError::SourceTooLarge(MAX_SOURCE_BYTES));
        }
        let runtime = Runtime::new().map_err(|e| RenderError::Script(e.to_string()))?;
        runtime.set_memory_limit(SCRIPT_MEMORY_LIMIT);
        runtime.set_max_stack_size(SCRIPT_STACK_LIMIT);

        let deadline = Arc::new(Mutex::new(Instant::now()));
        let interrupted = Arc::new(AtomicBool::new(false));
        let handler_deadline = Arc::clone(&deadline);
        let handler_interrupted = Arc::clone(&interrupted);
        runtime.set_interrupt_handler(Some(Box::new(move || {
            let expired = handler_deadline
                .lock()
                .map(|limit| Instant::now() >= *limit)
                .unwrap_or(true);
            if expired {
                handler_interrupted.store(true, Ordering::Relaxed);
            }
            expired
        })));

        let renderer = Self {
            runtime,
            deadline,
            interrupted,
            source: source.to_owned(),
        };
        renderer.arm_execution_budget()?;
        let context = Context::full(&renderer.runtime)
            .map_err(|error| RenderError::Script(error.to_string()))?;
        context.with(|ctx| -> Result<(), RenderError> {
            ctx.eval::<(), _>(BRIDGE)
                .map_err(|error| renderer.script_error(error))?;
            ctx.eval::<(), _>(format!("(function() {{\n{}\n}})();", renderer.source))
                .map_err(|error| renderer.script_error(error))?;
            let available = ctx
                .eval::<bool, _>("typeof globalThis.renderFrame === 'function'")
                .map_err(|error| renderer.script_error(error))?;
            if !available {
                return Err(RenderError::Script(
                    "No window.renderFrame function was found. Define window.renderFrame(time, frame, fps, ctx, width, height).".to_string(),
                ));
            }
            Ok(())
        })?;
        Ok(renderer)
    }

    pub fn render(
        &self,
        time: f64,
        frame: u64,
        fps: u32,
        logical_width: u32,
        logical_height: u32,
        output_width: u32,
        output_height: u32,
    ) -> Result<Pixmap, RenderError> {
        if logical_width == 0 || logical_height == 0 || output_width == 0 || output_height == 0 {
            return Err(RenderError::Dimensions(output_width, output_height));
        }
        if !time.is_finite() || fps == 0 {
            return Err(RenderError::Commands(
                "Frame time must be finite and frame rate must be non-zero.".into(),
            ));
        }
        let output_pixels = u64::from(output_width) * u64::from(output_height);
        if output_pixels > MAX_OUTPUT_PIXELS {
            return Err(RenderError::Raster(format!(
                "Requested frame exceeds the {MAX_OUTPUT_PIXELS} pixel safety limit."
            )));
        }

        self.arm_execution_budget()?;
        let context = Context::full(&self.runtime)
            .map_err(|error| RenderError::Script(error.to_string()))?;
        let command_json = context.with(|ctx| -> Result<String, RenderError> {
            ctx.eval::<(), _>(BRIDGE)
                .map_err(|error| self.script_error(error))?;
            ctx.eval::<(), _>(format!(
                "globalThis.__trilyvaFrame.beginFrame({logical_width}, {logical_height}, {frame});"
            ))
            .map_err(|error| self.script_error(error))?;
            ctx.eval::<(), _>(format!("(function() {{\n{}\n}})();", self.source))
                .map_err(|error| self.script_error(error))?;
            let available = ctx
                .eval::<bool, _>("typeof globalThis.renderFrame === 'function'")
                .map_err(|error| self.script_error(error))?;
            if !available {
                return Err(RenderError::Script(
                    "No window.renderFrame function was found. Define window.renderFrame(time, frame, fps, ctx, width, height).".to_string(),
                ));
            }
            let request = format!(
                "globalThis.renderFrame({time:.12}, {frame}, {fps}, globalThis.__trilyvaFrame.ctx, {logical_width}, {logical_height});\
                 JSON.stringify(globalThis.__trilyvaCommands)"
            );
            ctx.eval::<String, _>(request)
                .map_err(|error| self.script_error(error))
        })?;
        drop(context);
        if command_json.len() > MAX_FRAME_COMMAND_BYTES {
            return Err(RenderError::Commands(format!(
                "Frame drawing data exceeds the {MAX_FRAME_COMMAND_BYTES} byte safety limit."
            )));
        }
        let commands: Value = serde_json::from_str(&command_json)
            .map_err(|e| RenderError::Commands(e.to_string()))?;
        let list = commands.as_array()
            .ok_or_else(|| RenderError::Commands("The frame did not return a command array.".into()))?;
        if list.len() > MAX_FRAME_COMMANDS {
            return Err(RenderError::Commands(format!(
                "Frame contains more than the {MAX_FRAME_COMMANDS} command safety limit."
            )));
        }
        let mut pixmap = Pixmap::new(output_width, output_height)
            .ok_or(RenderError::Dimensions(output_width, output_height))?;
        let scale = Transform::from_scale(
            output_width as f32 / logical_width as f32,
            output_height as f32 / logical_height as f32,
        );
        for command in list {
            draw_command(&mut pixmap, command, scale)?;
        }
        Ok(pixmap)
    }

    fn arm_execution_budget(&self) -> Result<(), RenderError> {
        self.interrupted.store(false, Ordering::Relaxed);
        let mut deadline = self
            .deadline
            .lock()
            .map_err(|_| RenderError::Script("JavaScript runtime deadline lock was poisoned.".into()))?;
        *deadline = Instant::now() + SCRIPT_TIME_BUDGET;
        Ok(())
    }

    fn script_error(&self, error: impl Display) -> RenderError {
        if self.interrupted.load(Ordering::Relaxed) {
            RenderError::ExecutionBudget(SCRIPT_TIME_BUDGET.as_millis() as u64)
        } else {
            RenderError::Script(error.to_string())
        }
    }

    pub fn source(&self) -> &str { &self.source }
}

fn draw_command(pixmap: &mut Pixmap, command: &Value, scale: Transform) -> Result<(), RenderError> {
    let op = command.get("op").and_then(Value::as_str).unwrap_or("");
    if op == "text" {
        return Err(RenderError::Raster(
            "Canvas text drawing is not supported yet; this frame was not rendered.".into(),
        ));
    }
    if !matches!(op, "fill" | "stroke" | "clear") {
        return Err(RenderError::Commands(format!(
            "Unsupported Canvas operation '{op}'."
        )));
    }
    let Some(segments) = command.get("path").and_then(Value::as_array) else {
        return Err(RenderError::Commands(format!(
            "Canvas operation '{op}' has no supported path data."
        )));
    };
    if segments.is_empty() {
        return Ok(());
    }
    let mut builder = PathBuilder::new();
    for segment in segments {
        match segment.get("op").and_then(Value::as_str).unwrap_or("") {
            "M" => builder.move_to(number(segment, "x")?, number(segment, "y")?),
            "L" => builder.line_to(number(segment, "x")?, number(segment, "y")?),
            "C" => builder.cubic_to(
                number(segment, "x1")?, number(segment, "y1")?,
                number(segment, "x2")?, number(segment, "y2")?,
                number(segment, "x")?, number(segment, "y")?,
            ),
            "Z" => builder.close(),
            other => return Err(RenderError::Commands(format!(
                "Unsupported Canvas path segment '{other}'."
            ))),
        }
    }
    let Some(path) = builder.finish() else { return Ok(()); };
    let mut paint = Paint::default();
    paint.anti_alias = true;
    let alpha = command.get("alpha").and_then(Value::as_f64).unwrap_or(1.0) as f32;
    if op == "clear" {
        paint.blend_mode = BlendMode::Clear;
    } else if op == "fill" {
        let color = command.get("fill").and_then(Value::as_str).ok_or_else(|| {
            RenderError::Raster("Canvas gradient fills are not supported yet; use a solid fill color.".into())
        })?;
        paint.set_color(parse_color(color, alpha)
            .ok_or_else(|| RenderError::Raster("Unsupported fill color.".into()))?);
    } else if op == "stroke" {
        let color = command.get("stroke").and_then(Value::as_str).ok_or_else(|| {
            RenderError::Raster("Canvas gradient strokes are not supported yet; use a solid stroke color.".into())
        })?;
        paint.set_color(parse_color(color, alpha)
            .ok_or_else(|| RenderError::Raster("Unsupported stroke color.".into()))?);
    } else {
        return Err(RenderError::Commands(format!("Unsupported Canvas operation '{op}'.")));
    }
    if op == "stroke" {
        let line_cap = command.get("lineCap").and_then(Value::as_str).unwrap_or("butt");
        let line_join = command.get("lineJoin").and_then(Value::as_str).unwrap_or("miter");
        let has_dash = command
            .get("lineDash")
            .and_then(Value::as_array)
            .is_some_and(|segments| !segments.is_empty());
        if line_cap != "butt" || line_join != "miter" || has_dash {
            return Err(RenderError::Raster(
                "Canvas line caps, joins, and dash patterns are not supported yet; use butt caps, miter joins, and solid lines.".into(),
            ));
        }
        let width = command.get("width").and_then(Value::as_f64).unwrap_or(1.0) as f32;
        pixmap.stroke_path(&path, &paint, &Stroke { width: width.max(0.1), ..Default::default() }, scale, None);
    } else {
        pixmap.fill_path(&path, &paint, FillRule::Winding, scale, None);
    }
    Ok(())
}

fn number(value: &Value, key: &str) -> Result<f32, RenderError> {
    value.get(key).and_then(Value::as_f64).map(|v| v as f32).filter(|v| v.is_finite())
        .ok_or_else(|| RenderError::Commands(format!("Missing or invalid numeric field '{key}'.")))
}

fn parse_color(input: &str, opacity: f32) -> Option<tiny_skia::Color> {
    let name = input.trim().to_ascii_lowercase();
    let (r, g, b, a) = if let Some(hex) = name.strip_prefix('#') {
        match hex.len() {
            3 => {
                let mut it = hex.chars();
                (it.next()?.to_digit(16)? as f32 / 15.0, it.next()?.to_digit(16)? as f32 / 15.0, it.next()?.to_digit(16)? as f32 / 15.0, 1.0)
            }
            6 | 8 => {
                let r = u8::from_str_radix(&hex[0..2], 16).ok()? as f32 / 255.0;
                let g = u8::from_str_radix(&hex[2..4], 16).ok()? as f32 / 255.0;
                let b = u8::from_str_radix(&hex[4..6], 16).ok()? as f32 / 255.0;
                let a = if hex.len() == 8 { u8::from_str_radix(&hex[6..8], 16).ok()? as f32 / 255.0 } else { 1.0 };
                (r, g, b, a)
            }
            _ => return None,
        }
    } else {
        match name.as_str() {
            "white" => (1.0, 1.0, 1.0, 1.0),
            "black" => (0.0, 0.0, 0.0, 1.0),
            "transparent" => (0.0, 0.0, 0.0, 0.0),
            "red" => (1.0, 0.0, 0.0, 1.0),
            "green" => (0.0, 0.5, 0.0, 1.0),
            "blue" => (0.0, 0.0, 1.0, 1.0),
            "gray" | "grey" => (0.5, 0.5, 0.5, 1.0),
            _ if name.starts_with("rgba(") || name.starts_with("rgb(") => {
                let start = name.find('(')? + 1;
                let end = name.rfind(')')?;
                let values = name[start..end].split(',').map(|v| v.trim().trim_end_matches('%').parse::<f32>().ok()).collect::<Option<Vec<_>>>()?;
                if values.len() < 3 { return None; }
                let scale = if values[..3].iter().any(|v| *v > 1.0) { 255.0 } else { 1.0 };
                let alpha = if values.len() > 3 { values[3].clamp(0.0, 1.0) } else { 1.0 };
                (values[0] / scale, values[1] / scale, values[2] / scale, alpha)
            }
            _ => return None,
        }
    };
    tiny_skia::Color::from_rgba(r.clamp(0.0, 1.0), g.clamp(0.0, 1.0), b.clamp(0.0, 1.0), (a * opacity).clamp(0.0, 1.0))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn renders_basic_canvas_frame_from_native_contract() {
        let source = r##"window.renderFrame = function(time, frame, fps, ctx, width, height) {
            ctx.fillStyle = "#000000";
            ctx.fillRect(0, 0, width, height);
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(width / 2, height / 2, 16, 0, Math.PI * 2);
            ctx.fill();
        };"##;
        let renderer = FrameRenderer::new(source).expect("contract should load");
        let frame = renderer.render(0.0, 0, 60, 160, 90, 160, 90).expect("frame should rasterize");
        assert_eq!(frame.width(), 160);
        assert_eq!(frame.height(), 90);
        assert!(frame.data().chunks_exact(4).any(|p| p[0] > 200 && p[1] > 200 && p[2] > 200));
    }

    #[test]
    fn frame_output_does_not_depend_on_render_order() {
        let source = r##"var calls = 0;
            window.renderFrame = function(time, frame, fps, ctx, width, height) {
                calls += 1;
                ctx.fillStyle = calls % 2 ? "#ffffff" : "#000000";
                ctx.fillRect(0, 0, width, height);
            };"##;
        let renderer = FrameRenderer::new(source).expect("contract should load");
        let frame_zero = renderer.render(0.0, 0, 60, 16, 16, 16, 16).expect("frame should render");
        let frame_seven = renderer.render(7.0 / 60.0, 7, 60, 16, 16, 16, 16).expect("frame should render");
        assert_eq!(frame_zero.data(), frame_seven.data());
    }

    #[test]
    fn math_random_is_repeatable_for_the_same_frame() {
        let source = r##"window.renderFrame = function(time, frame, fps, ctx, width, height) {
                var red = Math.floor(Math.random() * 256);
                ctx.fillStyle = "rgb(" + red + ",0,0)";
                ctx.fillRect(0, 0, width, height);
            };"##;
        let renderer = FrameRenderer::new(source).expect("contract should load");
        let first = renderer.render(0.1, 6, 60, 16, 16, 16, 16).expect("frame should render");
        let repeated = renderer.render(0.1, 6, 60, 16, 16, 16, 16).expect("frame should render");
        assert_eq!(first.data(), repeated.data());
    }

    #[test]
    fn infinite_frame_script_is_interrupted() {
        let source = r##"window.renderFrame = function() { while (true) {} };"##;
        let renderer = FrameRenderer::new(source).expect("contract should load");
        let error = match renderer.render(0.0, 0, 60, 16, 16, 16, 16) {
            Ok(_) => panic!("infinite script must stop"),
            Err(error) => error,
        };
        assert!(matches!(error, RenderError::ExecutionBudget(_)));
    }

    #[test]
    fn unsupported_text_is_reported_instead_of_dropped() {
        let source = r##"window.renderFrame = function(time, frame, fps, ctx) {
                ctx.fillText("unsupported", 2, 12);
            };"##;
        let renderer = FrameRenderer::new(source).expect("contract should load");
        let error = match renderer.render(0.0, 0, 60, 16, 16, 16, 16) {
            Ok(_) => panic!("text is not implemented"),
            Err(error) => error,
        };
        assert!(error.to_string().contains("text drawing is not supported"));
    }

    #[test]
    fn unsupported_gradient_is_not_replaced_with_solid_white() {
        let source = r##"window.renderFrame = function(time, frame, fps, ctx, width, height) {
                var gradient = ctx.createLinearGradient(0, 0, width, 0);
                gradient.addColorStop(0, "#000000");
                gradient.addColorStop(1, "#ffffff");
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, width, height);
            };"##;
        let renderer = FrameRenderer::new(source).expect("contract should load");
        let error = match renderer.render(0.0, 0, 60, 16, 16, 16, 16) {
            Ok(_) => panic!("gradient is not implemented"),
            Err(error) => error,
        };
        assert!(error.to_string().contains("gradient fills are not supported"));
    }
}


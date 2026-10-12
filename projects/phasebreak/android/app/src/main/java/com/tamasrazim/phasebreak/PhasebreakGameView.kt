package com.tamasrazim.phasebreak

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.DashPathEffect
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Shader
import android.os.SystemClock
import android.view.HapticFeedbackConstants
import android.view.MotionEvent
import android.view.View
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin
import java.util.Random

/**
 * The whole game lives in this native Android View:
 * drawing, touch controls, collisions, level generation and local saves.
 * Coordinates are measured in dp so the physics feels similar on different screens.
 */
class PhasebreakGameView(context: Context) : View(context) {

    private enum class Screen { TITLE, PLAYING, PAUSED, STAGE_CLEAR }

    private data class Platform(
        val x: Float,
        val y: Float,
        val width: Float,
        val phase: Int,
        val checkpoint: Boolean = false
    )

    private data class Shard(
        val x: Float,
        val y: Float,
        val phase: Int,
        var collected: Boolean = false,
        val spinOffset: Float = 0f
    )

    private data class Spike(
        val x: Float,
        val y: Float,
        val width: Float,
        val phase: Int
    )

    private val prefs = context.getSharedPreferences("phasebreak_progress", Context.MODE_PRIVATE)
    private val densityScale = resources.displayMetrics.density
    private val ink = Color.rgb(246, 246, 242)
    private val paper = Color.rgb(205, 205, 201)
    private val mid = Color.rgb(126, 126, 133)
    private val muted = Color.rgb(85, 85, 94)
    private val darkLine = Color.rgb(39, 39, 46)
    private val background = Color.rgb(7, 7, 10)

    private val fill = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.FILL }
    private val stroke = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 1.2f
    }
    private val text = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = ink
        textSize = 13f
        typeface = android.graphics.Typeface.create("sans-serif-mono", android.graphics.Typeface.NORMAL)
    }
    private val titleText = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = ink
        textSize = 42f
        typeface = android.graphics.Typeface.create("sans-serif", android.graphics.Typeface.BOLD)
    }
    private val shapePath = Path()
    private val rect = RectF()

    private var screen = Screen.TITLE
    private var viewW = 0f
    private var viewH = 0f
    private var frameTime = 0L
    private var worldTime = 0f

    private var level = prefs.getInt("unlocked_level", 1).coerceAtLeast(1)
    private var totalShards = prefs.getInt("total_shards", 0)
    private var bestLevel = prefs.getInt("best_level", 1)
    private var runShards = 0
    private var currentPhase = 0 // 0 = SOL, 1 = UMBRA
    private var moveInput = 0
    private val movementPointers = HashMap<Int, Int>()

    private val platforms = ArrayList<Platform>()
    private val shards = ArrayList<Shard>()
    private val spikes = ArrayList<Spike>()

    private var playerX = 70f
    private var playerY = 0f
    private var playerVY = 0f
    private var onGround = false
    private var standingOn: Platform? = null
    private var cameraX = 0f
    private var floorY = 0f
    private var exitX = 0f
    private var checkpointX = 70f
    private var checkpointY = 0f
    private var checkpointPhase = 0
    private var phaseFlash = 0f

    private val playerW = 28f
    private val playerH = 42f
    private val gravity = 1420f
    private val jumpSpeed = 570f
    private val runSpeed = 258f

    init {
        isFocusable = true
        setLayerType(View.LAYER_TYPE_SOFTWARE, null)
        contentDescription = "PHASEBREAK, a two-reality platform game"
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        viewW = w / densityScale
        viewH = h / densityScale
        if (viewW > 0f && viewH > 0f) buildStage()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val now = SystemClock.elapsedRealtimeNanos()
        val delta = if (frameTime == 0L) 0f else ((now - frameTime) / 1_000_000_000f).coerceIn(0f, 0.034f)
        frameTime = now
        worldTime += delta

        val saved = canvas.save()
        canvas.scale(densityScale, densityScale)

        if (screen == Screen.PLAYING) updateGame(delta)
        drawBackground(canvas)

        when (screen) {
            Screen.TITLE -> drawTitleScreen(canvas)
            Screen.PLAYING -> drawGameScreen(canvas)
            Screen.PAUSED -> {
                drawGameScreen(canvas)
                drawPauseScreen(canvas)
            }
            Screen.STAGE_CLEAR -> {
                drawGameScreen(canvas)
                drawStageClear(canvas)
            }
        }

        canvas.restoreToCount(saved)
        // Keep the game responsive without running an uncapped render loop on high-refresh phones.
        postInvalidateDelayed(16L)
    }

    private fun buildStage() {
        if (viewH <= 0f || viewW <= 0f) return

        platforms.clear()
        shards.clear()
        spikes.clear()
        movementPointers.clear()
        moveInput = 0
        runShards = 0
        currentPhase = 0
        cameraX = 0f
        phaseFlash = 0f

        val random = Random(0x5048415345425245L + level.toLong() * 7919L)
        floorY = viewH * 0.74f
        var previousY = floorY
        var previousX = 0f

        // The broad starting ledge teaches the controls before the gaps get interesting.
        platforms.add(Platform(0f, floorY, 350f, 0, false))
        shards.add(Shard(245f, floorY - 62f, 0, false, 0.3f))

        val stageCount = 11
        for (i in 0 until stageCount) {
            val previousWidth = if (i == 0) 350f else platforms.last().width
            val gapRange = min(70, 42 + level * 2)
            val gap = 42f + random.nextInt(max(1, gapRange - 41)).toFloat()
            val x = previousX + previousWidth + gap
            val heightChange = random.nextInt(73) - 36
            val y = (previousY + heightChange).coerceIn(viewH * 0.43f, viewH * 0.77f)
            val width = 112f + random.nextInt(45).toFloat()
            val phase = if (i == stageCount - 1) 0 else if (random.nextInt(7) == 0) 2 else (i + 1) % 2
            val checkpoint = i == 3 || i == 7
            val platform = Platform(x, y, width, phase, checkpoint)
            platforms.add(platform)

            if (checkpoint) {
                // Checkpoints are small beacons on solid ground; falling never erases progress.
                shards.add(Shard(x + width * 0.27f, y - 54f, phase, false, i * 0.41f))
            } else {
                shards.add(Shard(x + width * 0.52f, y - 52f, phase, false, i * 0.59f))
            }

            if (i >= 2 && i < stageCount - 1 && i % 3 == 2 && width > 120f) {
                spikes.add(Spike(x + width * 0.62f, y, 30f, phase))
            }

            previousX = x
            previousY = y
        }

        val finalPlatform = platforms.last()
        exitX = finalPlatform.x + finalPlatform.width - 34f
        // The last ledge is the finish platform and always supports the light phase.
        checkpointX = 70f
        checkpointY = floorY - playerH
        checkpointPhase = 0
        playerX = 70f
        playerY = checkpointY
        playerVY = 0f
        onGround = true
        standingOn = platforms.first()
    }

    private fun updateGame(delta: Float) {
        if (delta <= 0f) return
        phaseFlash = max(0f, phaseFlash - delta * 2.7f)

        val oldBottom = playerY + playerH
        playerX += moveInput * runSpeed * delta
        playerX = max(0f, playerX)

        playerVY += gravity * delta
        playerY += playerVY * delta

        onGround = false
        standingOn = null
        if (playerVY >= 0f) {
            val newBottom = playerY + playerH
            var bestLanding: Platform? = null
            for (platform in platforms) {
                if (!phaseSupports(currentPhase, platform.phase)) continue
                val overlapsSide = playerX + playerW > platform.x && playerX < platform.x + platform.width
                val crossesTop = oldBottom <= platform.y + 4f && newBottom >= platform.y
                if (overlapsSide && crossesTop && (bestLanding == null || platform.y < bestLanding.y)) {
                    bestLanding = platform
                }
            }
            if (bestLanding != null) {
                playerY = bestLanding.y - playerH
                playerVY = 0f
                onGround = true
                standingOn = bestLanding
                if (bestLanding.checkpoint && playerX >= bestLanding.x) {
                    checkpointX = bestLanding.x + 14f
                    checkpointY = bestLanding.y - playerH
                    checkpointPhase = if (bestLanding.phase == 2) currentPhase else bestLanding.phase
                }
            }
        }

        val shardIterator = shards.iterator()
        while (shardIterator.hasNext()) {
            val shard = shardIterator.next()
            if (shard.collected || !phaseSupports(currentPhase, shard.phase)) continue
            val dx = abs((playerX + playerW * 0.5f) - shard.x)
            val dy = abs((playerY + playerH * 0.5f) - shard.y)
            if (dx < 27f && dy < 34f) {
                shard.collected = true
                runShards += 1
                totalShards += 1
                prefs.edit().putInt("total_shards", totalShards).apply()
                performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)
            }
        }

        for (spike in spikes) {
            if (!phaseSupports(currentPhase, spike.phase)) continue
            val sideHit = playerX + playerW > spike.x && playerX < spike.x + spike.width
            val footHit = playerY + playerH > spike.y - 22f && playerY + playerH < spike.y + 18f
            if (sideHit && footHit) {
                respawnAtCheckpoint()
                return
            }
        }

        if (playerY > viewH + 180f) {
            respawnAtCheckpoint()
            return
        }

        if (standingOn != null && standingOn!!.checkpoint && playerX >= standingOn!!.x) {
            checkpointX = standingOn!!.x + 14f
            checkpointY = standingOn!!.y - playerH
            checkpointPhase = if (standingOn!!.phase == 2) currentPhase else standingOn!!.phase
        }

        cameraX = max(0f, playerX - viewW * 0.31f)
        if (standingOn == platforms.last() && playerX + playerW >= exitX) {
            screen = Screen.STAGE_CLEAR
            moveInput = 0
            movementPointers.clear()
            val nextUnlocked = max(level + 1, prefs.getInt("unlocked_level", 1))
            bestLevel = max(bestLevel, level)
            prefs.edit()
                .putInt("unlocked_level", nextUnlocked)
                .putInt("best_level", bestLevel)
                .apply()
            performHapticFeedback(HapticFeedbackConstants.CONFIRM)
        }
    }

    private fun respawnAtCheckpoint() {
        playerX = checkpointX
        playerY = checkpointY
        playerVY = 0f
        currentPhase = checkpointPhase
        onGround = true
        moveInput = 0
        movementPointers.clear()
        standingOn = platforms.firstOrNull {
            abs(it.x - checkpointX) < 45f && phaseSupports(currentPhase, it.phase)
        } ?: platforms.first()
        cameraX = max(0f, playerX - viewW * 0.31f)
        phaseFlash = 0.65f
        performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
    }

    private fun phaseSupports(activePhase: Int, platformPhase: Int): Boolean =
        platformPhase == 2 || activePhase == platformPhase

    private fun switchPhase() {
        currentPhase = 1 - currentPhase
        phaseFlash = 1f
        performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)
    }

    private fun jump() {
        if (!onGround || screen != Screen.PLAYING) return
        playerVY = -jumpSpeed
        onGround = false
        standingOn = null
        performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)
    }

    private fun startGame() {
        val unlocked = prefs.getInt("unlocked_level", 1).coerceAtLeast(1)
        level = unlocked
        buildStage()
        screen = Screen.PLAYING
    }

    private fun advanceStage() {
        level = max(level + 1, prefs.getInt("unlocked_level", 1))
        bestLevel = max(bestLevel, level - 1)
        buildStage()
        screen = Screen.PLAYING
    }

    fun pauseForLifecycle() {
        if (screen == Screen.PLAYING) {
            screen = Screen.PAUSED
            moveInput = 0
            movementPointers.clear()
        }
    }

    fun handleBack() {
        when (screen) {
            Screen.PLAYING -> {
                screen = Screen.PAUSED
                moveInput = 0
                movementPointers.clear()
            }
            Screen.PAUSED -> screen = Screen.PLAYING
            Screen.STAGE_CLEAR -> advanceStage()
            Screen.TITLE -> Unit
        }
        invalidate()
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN, MotionEvent.ACTION_POINTER_DOWN -> {
                val index = event.actionIndex
                val pointerId = event.getPointerId(index)
                handlePress(pointerId, event.getX(index) / densityScale, event.getY(index) / densityScale)
                return true
            }
            MotionEvent.ACTION_MOVE -> {
                for (i in 0 until event.pointerCount) {
                    val pointerId = event.getPointerId(i)
                    if (movementPointers.containsKey(pointerId)) {
                        val x = event.getX(i) / densityScale
                        val y = event.getY(i) / densityScale
                        val direction = directionAt(x, y)
                        if (direction == 0) movementPointers.remove(pointerId)
                        else movementPointers[pointerId] = direction
                    }
                }
                updateMoveInput()
                return true
            }
            MotionEvent.ACTION_UP, MotionEvent.ACTION_POINTER_UP, MotionEvent.ACTION_CANCEL -> {
                val index = if (event.actionMasked == MotionEvent.ACTION_CANCEL) 0 else event.actionIndex
                if (event.pointerCount > 0) movementPointers.remove(event.getPointerId(index))
                updateMoveInput()
                performClick()
                return true
            }
        }
        return true
    }

    override fun performClick(): Boolean {
        super.performClick()
        return true
    }

    private fun handlePress(pointerId: Int, x: Float, y: Float) {
        when (screen) {
            Screen.TITLE -> {
                startGame()
                return
            }
            Screen.STAGE_CLEAR -> {
                advanceStage()
                return
            }
            Screen.PAUSED -> {
                if (y > viewH * 0.62f && x < viewW * 0.5f) {
                    buildStage()
                    screen = Screen.PLAYING
                } else {
                    screen = Screen.PLAYING
                }
                return
            }
            Screen.PLAYING -> Unit
        }

        if (x > viewW - 76f && y < 58f) {
            screen = Screen.PAUSED
            moveInput = 0
            movementPointers.clear()
            return
        }

        if (y > viewH - 146f && x > viewW - 106f) {
            switchPhase()
            return
        }
        if (y > viewH - 146f && x > viewW - 208f) {
            jump()
            return
        }

        val direction = directionAt(x, y)
        if (direction != 0) {
            movementPointers[pointerId] = direction
            updateMoveInput()
        } else if (x > viewW * 0.5f) {
            jump()
        }
    }

    private fun directionAt(x: Float, y: Float): Int {
        if (y < viewH - 155f || x > viewW * 0.36f) return 0
        return if (x < 103f) -1 else 1
    }

    private fun updateMoveInput() {
        val left = movementPointers.values.any { it < 0 }
        val right = movementPointers.values.any { it > 0 }
        moveInput = when {
            left && !right -> -1
            right && !left -> 1
            else -> 0
        }
    }

    private fun drawBackground(canvas: Canvas) {
        fill.shader = LinearGradient(
            0f, 0f, 0f, viewH,
            intArrayOf(Color.rgb(10, 10, 14), background, Color.rgb(5, 5, 7)),
            null,
            Shader.TileMode.CLAMP
        )
        canvas.drawRect(0f, 0f, viewW, viewH, fill)
        fill.shader = null

        // The moving grid gives the stages depth without needing downloaded textures.
        stroke.color = Color.rgb(23, 23, 29)
        stroke.strokeWidth = 0.7f
        val gridSpacing = 42f
        var lineX = -((cameraX * 0.18f) % gridSpacing)
        while (lineX < viewW) {
            canvas.drawLine(lineX, 0f, lineX, viewH, stroke)
            lineX += gridSpacing
        }
        var lineY = viewH * 0.18f
        while (lineY < viewH) {
            canvas.drawLine(0f, lineY, viewW, lineY, stroke)
            lineY += gridSpacing
        }

        // Small distant lights are deterministic, so the background does not flicker.
        fill.color = Color.rgb(80, 80, 89)
        for (i in 0 until 32) {
            val starX = ((i * 137f - cameraX * 0.11f) % (viewW + 50f) + viewW + 50f) % (viewW + 50f)
            val starY = 22f + ((i * 59f) % max(60f, viewH - 80f))
            val pulse = 0.7f + (sin(worldTime * 1.2f + i) * 0.3f)
            fill.alpha = (95f * pulse).toInt().coerceIn(30, 120)
            canvas.drawCircle(starX, starY, if (i % 5 == 0) 1.7f else 1f, fill)
        }
        fill.alpha = 255

        // A large faint ring is a visual cue that both realities share one space.
        stroke.color = Color.argb(24, 238, 238, 232)
        stroke.strokeWidth = 1f
        canvas.drawCircle(viewW * 0.77f, viewH * 0.42f, min(viewW, viewH) * 0.31f, stroke)
    }

    private fun drawTitleScreen(canvas: Canvas) {
        drawPrism(canvas, viewW * 0.72f, viewH * 0.43f, 72f, worldTime * 0.75f, 1f)
        text.color = mid
        text.textSize = 10f
        canvas.drawText("TWO REALITIES. ONE WAY OUT.", 34f, viewH * 0.25f, text)

        titleText.textSize = min(54f, viewW * 0.078f)
        titleText.color = ink
        canvas.drawText("PHASEBREAK", 32f, viewH * 0.43f, titleText)

        text.color = paper
        text.textSize = 13f
        canvas.drawText("Switch the world before the world switches you.", 35f, viewH * 0.51f, text)
        text.color = mid
        text.textSize = 10f
        canvas.drawText("NATIVE ANDROID  /  OFFLINE  /  STAGE " + level, 35f, viewH * 0.60f, text)

        drawButton(canvas, 34f, viewH * 0.69f, 218f, 47f, "ENTER THE BREACH")
        text.color = mid
        text.textSize = 10f
        canvas.drawText("SHARDS " + totalShards + "     BEST STAGE " + bestLevel, 36f, viewH * 0.69f + 70f, text)

        stroke.color = Color.rgb(70, 70, 78)
        stroke.strokeWidth = 1f
        canvas.drawLine(viewW - 46f, viewH - 27f, viewW - 28f, viewH - 27f, stroke)
        canvas.drawLine(viewW - 37f, viewH - 36f, viewW - 37f, viewH - 18f, stroke)
        text.color = muted
        text.textSize = 9f
        canvas.drawText("SOL  /  UMBRA", viewW - 152f, viewH - 23f, text)
    }

    private fun drawGameScreen(canvas: Canvas) {
        drawWorld(canvas)
        drawPlayer(canvas)
        drawHud(canvas)
        drawControls(canvas)
        if (phaseFlash > 0f) {
            fill.color = if (currentPhase == 0) Color.argb((phaseFlash * 34f).toInt(), 255, 255, 255)
            else Color.argb((phaseFlash * 27f).toInt(), 100, 100, 112)
            canvas.drawRect(0f, 0f, viewW, viewH, fill)
        }
    }

    private fun drawWorld(canvas: Canvas) {
        // Draw a subtle floor guide below the route so gaps are easy to read.
        stroke.color = Color.rgb(35, 35, 42)
        stroke.strokeWidth = 1f
        canvas.drawLine(0f, floorY + 54f, viewW, floorY + 54f, stroke)

        for (platform in platforms) {
            val sx = platform.x - cameraX
            if (sx + platform.width < -20f || sx > viewW + 20f) continue
            val active = phaseSupports(currentPhase, platform.phase)
            val platformRect = RectF(sx, platform.y, sx + platform.width, platform.y + 11f)

            fill.color = if (active) Color.rgb(218, 218, 214) else Color.rgb(32, 32, 39)
            canvas.drawRoundRect(platformRect, 3f, 3f, fill)

            stroke.color = if (active) Color.rgb(250, 250, 245) else Color.rgb(78, 78, 88)
            stroke.strokeWidth = if (active) 1.1f else 0.8f
            stroke.pathEffect = if (active) null else DashPathEffect(floatArrayOf(4f, 5f), 0f)
            canvas.drawRoundRect(platformRect, 3f, 3f, stroke)
            stroke.pathEffect = null

            if (platform.phase == 2) {
                stroke.color = if (active) ink else muted
                stroke.strokeWidth = 1f
                canvas.drawLine(sx + 10f, platform.y + 5f, sx + platform.width - 10f, platform.y + 5f, stroke)
            }

            if (platform.checkpoint) {
                val poleX = sx + 18f
                stroke.color = if (active) ink else muted
                stroke.strokeWidth = 1f
                canvas.drawLine(poleX, platform.y - 2f, poleX, platform.y - 30f, stroke)
                shapePath.reset()
                shapePath.moveTo(poleX, platform.y - 29f)
                shapePath.lineTo(poleX + 18f, platform.y - 24f)
                shapePath.lineTo(poleX, platform.y - 18f)
                shapePath.close()
                fill.color = if (active) ink else darkLine
                canvas.drawPath(shapePath, fill)
            }
        }

        for (spike in spikes) {
            if (!phaseSupports(currentPhase, spike.phase)) continue
            val sx = spike.x - cameraX
            if (sx + spike.width < -10f || sx > viewW + 10f) continue
            shapePath.reset()
            shapePath.moveTo(sx, spike.y + 1f)
            shapePath.lineTo(sx + spike.width * 0.5f, spike.y - 21f)
            shapePath.lineTo(sx + spike.width, spike.y + 1f)
            shapePath.close()
            fill.color = ink
            canvas.drawPath(shapePath, fill)
            stroke.color = Color.rgb(75, 75, 83)
            stroke.strokeWidth = 1f
            canvas.drawPath(shapePath, stroke)
        }

        for (shard in shards) {
            if (shard.collected) continue
            val sx = shard.x - cameraX
            if (sx < -30f || sx > viewW + 30f) continue
            val active = phaseSupports(currentPhase, shard.phase)
            val bob = sin(worldTime * 2.4f + shard.spinOffset) * 4f
            val radius = 7f + sin(worldTime * 2f + shard.spinOffset) * 1.2f
            stroke.color = if (active) ink else muted
            stroke.strokeWidth = 1.2f
            canvas.drawCircle(sx, shard.y + bob, radius + 5f, stroke)
            shapePath.reset()
            shapePath.moveTo(sx, shard.y + bob - radius)
            shapePath.lineTo(sx + radius * 0.72f, shard.y + bob)
            shapePath.lineTo(sx, shard.y + bob + radius)
            shapePath.lineTo(sx - radius * 0.72f, shard.y + bob)
            shapePath.close()
            fill.color = if (active) ink else Color.rgb(65, 65, 73)
            canvas.drawPath(shapePath, fill)
        }

        drawExitGate(canvas)
    }

    private fun drawExitGate(canvas: Canvas) {
        val x = exitX - cameraX
        if (x < -100f || x > viewW + 100f) return
        val last = platforms.lastOrNull() ?: return
        val centerY = last.y - 44f
        val pulse = 0.7f + sin(worldTime * 2.2f) * 0.12f

        stroke.color = Color.argb((160f * pulse).toInt(), 245, 245, 239)
        stroke.strokeWidth = 2f
        canvas.drawOval(x - 18f, centerY - 34f, x + 18f, centerY + 34f, stroke)
        stroke.color = Color.argb(85, 200, 200, 196)
        stroke.strokeWidth = 1f
        canvas.drawOval(x - 27f, centerY - 43f, x + 27f, centerY + 43f, stroke)

        fill.color = ink
        canvas.drawCircle(x, centerY, 2.5f, fill)
        text.color = mid
        text.textSize = 8f
        canvas.drawText("EXIT", x - 12f, centerY - 52f, text)
    }

    private fun drawPlayer(canvas: Canvas) {
        val sx = playerX - cameraX
        val centerY = playerY + playerH * 0.5f

        fill.color = Color.argb(35, 255, 255, 255)
        canvas.drawCircle(sx + playerW * 0.5f, centerY, 28f, fill)

        // A small angular character stays crisp at every phone resolution.
        shapePath.reset()
        shapePath.moveTo(sx + playerW * 0.5f, playerY)
        shapePath.lineTo(sx + playerW, playerY + 12f)
        shapePath.lineTo(sx + playerW - 3f, playerY + 34f)
        shapePath.lineTo(sx + playerW * 0.5f, playerY + playerH)
        shapePath.lineTo(sx + 3f, playerY + 34f)
        shapePath.lineTo(sx, playerY + 12f)
        shapePath.close()
        fill.color = if (currentPhase == 0) ink else Color.rgb(157, 157, 166)
        canvas.drawPath(shapePath, fill)

        stroke.color = if (currentPhase == 0) Color.rgb(100, 100, 110) else ink
        stroke.strokeWidth = 1.1f
        canvas.drawLine(sx + playerW * 0.5f, playerY + 8f, sx + playerW * 0.5f, playerY + 33f, stroke)
        canvas.drawLine(sx + 5f, playerY + 15f, sx + playerW - 5f, playerY + 15f, stroke)

        fill.color = if (currentPhase == 0) Color.rgb(12, 12, 15) else ink
        canvas.drawCircle(sx + playerW * 0.5f, playerY + 14f, 2.2f, fill)
    }

    private fun drawHud(canvas: Canvas) {
        text.color = mid
        text.textSize = 9f
        canvas.drawText("PHASEBREAK  /  STAGE " + level.toString().padStart(2, '0'), 22f, 26f, text)

        text.color = ink
        text.textSize = 12f
        canvas.drawText(if (currentPhase == 0) "SOL" else "UMBRA", 22f, 47f, text)
        text.color = muted
        text.textSize = 9f
        canvas.drawText("SHARDS " + runShards + "  /  TOTAL " + totalShards, 22f, 64f, text)

        val progress = (playerX / max(1f, exitX)).coerceIn(0f, 1f)
        rect.set(viewW * 0.34f, 23f, viewW * 0.73f, 27f)
        fill.color = Color.rgb(36, 36, 43)
        canvas.drawRoundRect(rect, 3f, 3f, fill)
        rect.right = rect.left + (rect.width() * progress)
        fill.color = ink
        canvas.drawRoundRect(rect, 3f, 3f, fill)

        text.color = mid
        text.textSize = 9f
        canvas.drawText((progress * 100f).toInt().toString() + "%", viewW * 0.745f, 27f, text)

        // Keep pause outside the main movement zones.
        stroke.color = Color.rgb(160, 160, 166)
        stroke.strokeWidth = 1.4f
        canvas.drawRoundRect(viewW - 53f, 14f, viewW - 22f, 43f, 5f, 5f, stroke)
        fill.color = ink
        canvas.drawRect(viewW - 43f, 22f, viewW - 40f, 35f, fill)
        canvas.drawRect(viewW - 35f, 22f, viewW - 32f, 35f, fill)
    }

    private fun drawControls(canvas: Canvas) {
        val controlY = viewH - 70f
        drawControlCircle(canvas, 61f, controlY, "‹", moveInput == -1)
        drawControlCircle(canvas, 133f, controlY, "›", moveInput == 1)
        drawControlCircle(canvas, viewW - 156f, controlY, "JUMP", false)
        drawControlCircle(canvas, viewW - 61f, controlY, "PHASE", false)

        text.color = if (currentPhase == 0) ink else mid
        text.textSize = 8f
        canvas.drawText(if (currentPhase == 0) "SOL ACTIVE" else "UMBRA ACTIVE", viewW - 123f, viewH - 128f, text)
    }

    private fun drawControlCircle(canvas: Canvas, x: Float, y: Float, label: String, pressed: Boolean) {
        fill.color = if (pressed) Color.rgb(82, 82, 90) else Color.argb(20, 255, 255, 255)
        canvas.drawCircle(x, y, 27f, fill)
        stroke.color = if (pressed) ink else Color.rgb(100, 100, 110)
        stroke.strokeWidth = 1f
        canvas.drawCircle(x, y, 27f, stroke)
        text.color = if (pressed) ink else paper
        text.textSize = if (label.length > 2) 8f else 22f
        val measured = text.measureText(label)
        canvas.drawText(label, x - measured * 0.5f, y + if (label.length > 2) 3f else 8f, text)
    }

    private fun drawPauseScreen(canvas: Canvas) {
        fill.color = Color.argb(190, 4, 4, 7)
        canvas.drawRect(0f, 0f, viewW, viewH, fill)
        titleText.textSize = 34f
        titleText.color = ink
        canvas.drawText("PAUSED", 38f, viewH * 0.40f, titleText)
        text.color = mid
        text.textSize = 12f
        canvas.drawText("Tap the right side to resume.", 40f, viewH * 0.49f, text)
        drawButton(canvas, 40f, viewH * 0.61f, 210f, 43f, "RESTART STAGE")
        text.color = mid
        text.textSize = 10f
        canvas.drawText("BACK TO GAME  /  tap elsewhere", 40f, viewH * 0.61f + 66f, text)
    }

    private fun drawStageClear(canvas: Canvas) {
        fill.color = Color.argb(210, 4, 4, 7)
        canvas.drawRect(0f, 0f, viewW, viewH, fill)
        drawPrism(canvas, viewW * 0.72f, viewH * 0.43f, 54f, worldTime, 1f)
        text.color = mid
        text.textSize = 10f
        canvas.drawText("REALITY STABILIZED", 36f, viewH * 0.27f, text)
        titleText.textSize = min(48f, viewW * 0.07f)
        titleText.color = ink
        canvas.drawText("STAGE " + level + " CLEAR", 34f, viewH * 0.43f, titleText)
        text.color = paper
        text.textSize = 13f
        canvas.drawText("Prism shards recovered: " + runShards, 38f, viewH * 0.52f, text)
        drawButton(canvas, 36f, viewH * 0.64f, 236f, 48f, "ENTER NEXT STAGE")
        text.color = mid
        text.textSize = 10f
        canvas.drawText("PROGRESS SAVED ON THIS DEVICE", 38f, viewH * 0.64f + 72f, text)
    }

    private fun drawPrism(canvas: Canvas, centerX: Float, centerY: Float, size: Float, rotation: Float, opacity: Float) {
        val half = size * 0.5f
        shapePath.reset()
        for (i in 0 until 6) {
            val angle = rotation + i * Math.PI.toFloat() / 3f
            val x = centerX + kotlin.math.cos(angle) * half
            val y = centerY + kotlin.math.sin(angle) * half
            if (i == 0) shapePath.moveTo(x, y) else shapePath.lineTo(x, y)
        }
        shapePath.close()
        stroke.color = Color.argb((190f * opacity).toInt(), 242, 242, 236)
        stroke.strokeWidth = 1.5f
        canvas.drawPath(shapePath, stroke)

        val inner = half * 0.53f
        shapePath.reset()
        for (i in 0 until 6) {
            val angle = -rotation * 0.7f + i * Math.PI.toFloat() / 3f
            val x = centerX + kotlin.math.cos(angle) * inner
            val y = centerY + kotlin.math.sin(angle) * inner
            if (i == 0) shapePath.moveTo(x, y) else shapePath.lineTo(x, y)
        }
        shapePath.close()
        stroke.color = Color.argb((130f * opacity).toInt(), 150, 150, 160)
        stroke.strokeWidth = 1f
        canvas.drawPath(shapePath, stroke)
        canvas.drawLine(centerX - half * 0.85f, centerY, centerX + half * 0.85f, centerY, stroke)
        canvas.drawLine(centerX, centerY - half * 0.85f, centerX, centerY + half * 0.85f, stroke)
    }

    private fun drawButton(canvas: Canvas, x: Float, y: Float, width: Float, height: Float, label: String) {
        rect.set(x, y, x + width, y + height)
        fill.color = ink
        canvas.drawRoundRect(rect, 3f, 3f, fill)
        text.color = Color.rgb(9, 9, 12)
        text.textSize = 11f
        text.typeface = android.graphics.Typeface.create("sans-serif-mono", android.graphics.Typeface.BOLD)
        canvas.drawText(label, x + 15f, y + height * 0.5f + 4f, text)
        text.typeface = android.graphics.Typeface.create("sans-serif-mono", android.graphics.Typeface.NORMAL)
        stroke.color = paper
        stroke.strokeWidth = 1f
        canvas.drawLine(x + width - 28f, y + height * 0.5f, x + width - 14f, y + height * 0.5f, stroke)
        canvas.drawLine(x + width - 20f, y + height * 0.5f - 6f, x + width - 14f, y + height * 0.5f, stroke)
        canvas.drawLine(x + width - 20f, y + height * 0.5f + 6f, x + width - 14f, y + height * 0.5f, stroke)
    }
}

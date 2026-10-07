#include "raylib.h"
#include "raymath.h"

#include <algorithm>
#include <cmath>
#include <ctime>
#include <vector>

struct Enemy {
    Vector3 pos{};
    float radius = 0.42f;
    int hp = 2;
    float attackTimer = 0.0f;
    float hurtTimer = 0.0f;
    bool alive = true;
};

struct BoxObstacle {
    Vector3 pos{};
    Vector3 size{};
};

struct Tracer {
    Vector3 a{}, b{};
    float ttl = 0.0f;
};

enum class GameState { Menu, Playing, Paused, Won, Lost };

static const float ARENA_HALF = 12.0f;
static const float PLAYER_RADIUS = 0.38f;
static const int MAX_WAVES = 4;

static Vector3 V3(float x, float y, float z) { return {x, y, z}; }

static bool CircleVsBox(Vector3 p, float r, const BoxObstacle& box) {
    Vector3 h = Vector3Scale(box.size, 0.5f);
    float minX = box.pos.x - h.x, maxX = box.pos.x + h.x;
    float minZ = box.pos.z - h.z, maxZ = box.pos.z + h.z;
    float cx = Clamp(p.x, minX, maxX);
    float cz = Clamp(p.z, minZ, maxZ);
    float dx = p.x - cx, dz = p.z - cz;
    return (dx * dx + dz * dz) < (r * r);
}

static bool CanOccupy(Vector3 p, const std::vector<BoxObstacle>& obstacles) {
    if (p.x < -ARENA_HALF + PLAYER_RADIUS || p.x > ARENA_HALF - PLAYER_RADIUS ||
        p.z < -ARENA_HALF + PLAYER_RADIUS || p.z > ARENA_HALF - PLAYER_RADIUS) return false;
    for (const auto& b : obstacles) if (CircleVsBox(p, PLAYER_RADIUS, b)) return false;
    return true;
}

static Vector3 Forward(float yaw, float pitch = 0.0f) {
    float cp = cosf(pitch);
    return Vector3Normalize(V3(sinf(yaw) * cp, sinf(pitch), cosf(yaw) * cp));
}

static Vector3 SpawnPoint(int index, int wave) {
    const float r = 9.7f;
    const float angle = (float)(index * 2.39996323 + wave * 0.55);
    return V3(cosf(angle) * r, 0.9f, sinf(angle) * r);
}

static void SpawnWave(std::vector<Enemy>& enemies, int wave) {
    enemies.clear();
    int count = 4 + wave * 2;
    for (int i = 0; i < count; ++i) {
        Enemy e;
        e.pos = SpawnPoint(i, wave);
        e.hp = 1 + (wave >= 2 ? 1 : 0);
        e.radius = wave >= 3 ? 0.46f : 0.42f;
        enemies.push_back(e);
    }
}

static int AliveCount(const std::vector<Enemy>& enemies) {
    int n = 0;
    for (const auto& e : enemies) if (e.alive) ++n;
    return n;
}

static void DrawCenteredText(const char* text, int y, int size, Color c) {
    int w = MeasureText(text, size);
    DrawText(text, (GetScreenWidth() - w) / 2, y, size, c);
}

static void DrawCrosshair(bool hit) {
    const int x = GetScreenWidth() / 2;
    const int y = GetScreenHeight() / 2;
    Color c = hit ? RED : RAYWHITE;
    DrawLine(x - 12, y, x - 3, y, c);
    DrawLine(x + 3, y, x + 12, y, c);
    DrawLine(x, y - 12, x, y - 3, c);
    DrawLine(x, y + 3, x, y + 12, c);
    DrawCircleLines(x, y, 3, c);
}

static void DrawBlaster(float recoil, bool muzzle) {
    int w = GetScreenWidth(), h = GetScreenHeight();
    float s = std::min(w, h) / 900.0f;
    float bx = w * 0.69f;
    float by = h * 0.77f + recoil * 12.0f;

    DrawRectangle((int)bx, (int)by, (int)(260*s), (int)(100*s), Color{20,24,35,255});
    DrawRectangle((int)(bx+60*s), (int)(by-28*s), (int)(105*s), (int)(50*s), Color{45,55,75,255});
    DrawRectangle((int)(bx+180*s), (int)(by-8*s), (int)(80*s), (int)(20*s), Color{75,90,120,255});
    DrawRectangle((int)(bx+85*s), (int)(by+12*s), (int)(45*s), (int)(80*s), Color{30,35,48,255});
    DrawRectangle((int)(bx+96*s), (int)(by+20*s), (int)(18*s), (int)(52*s), Color{105,210,255,255});
    if (muzzle) {
        DrawCircle((int)(bx+266*s), (int)(by+2*s), (int)(24*s), GOLD);
        DrawCircle((int)(bx+266*s), (int)(by+2*s), (int)(11*s), WHITE);
    }
}

int main() {
    SetConfigFlags(FLAG_MSAA_4X_HINT | FLAG_WINDOW_RESIZABLE | FLAG_VSYNC_HINT);
    InitWindow(1440, 900, "NEON BREACH");
    SetExitKey(KEY_NULL);
    DisableCursor();
    SetTargetFPS(144);

    Camera3D camera{};
    camera.up = V3(0, 1, 0);
    camera.fovy = 70.0f;
    camera.projection = CAMERA_PERSPECTIVE;

    GameState state = GameState::Menu;
    std::vector<BoxObstacle> obstacles = {
        {V3(0,1.0f,0), V3(2.8f,2.0f,2.8f)},
        {V3(-5,1.0f,-4), V3(3.0f,2.0f,2.0f)},
        {V3(5,1.0f,4), V3(3.0f,2.0f,2.0f)},
        {V3(-5,1.0f,5), V3(2.0f,2.0f,3.0f)},
        {V3(5,1.0f,-5), V3(2.0f,2.0f,3.0f)},
    };

    Vector3 player = V3(0, 1.0f, 8.0f);
    float yaw = PI, pitch = 0.0f;
    float health = 100.0f, sprintEnergy = 100.0f;
    int ammo = 12, reserve = 72, wave = 1, kills = 0;
    float fireCooldown = 0.0f, reloadTimer = 0.0f, hitMarker = 0.0f;
    float muzzleTimer = 0.0f, damageFlash = 0.0f, nextWaveTimer = 0.0f, elapsed = 0.0f;
    float recoil = 0.0f;
    bool reloading = false;
    bool mouseLocked = true;
    std::vector<Enemy> enemies;
    std::vector<Tracer> tracers;
    SpawnWave(enemies, wave);

    auto ResetGame = [&]() {
        player = V3(0, 1.0f, 8.0f);
        yaw = PI; pitch = 0.0f;
        health = 100.0f; sprintEnergy = 100.0f;
        ammo = 12; reserve = 72; wave = 1; kills = 0;
        fireCooldown = reloadTimer = hitMarker = muzzleTimer = damageFlash = nextWaveTimer = elapsed = recoil = 0;
        reloading = false;
        tracers.clear();
        SpawnWave(enemies, wave);
        state = GameState::Playing;
        DisableCursor();
        mouseLocked = true;
    };

    while (!WindowShouldClose()) {
        float dt = GetFrameTime();
        dt = std::min(dt, 0.05f);
        elapsed += dt;

        if (state == GameState::Menu) {
            EnableCursor();
            mouseLocked = false;
            if (IsKeyPressed(KEY_ENTER) || IsMouseButtonPressed(MOUSE_BUTTON_LEFT)) ResetGame();
        } else if (state == GameState::Playing) {
            if (IsKeyPressed(KEY_ESCAPE)) {
                state = GameState::Paused;
                EnableCursor();
                mouseLocked = false;
            }

            Vector2 md = GetMouseDelta();
            const float sensitivity = 0.0022f;
            yaw -= md.x * sensitivity;
            pitch = Clamp(pitch + md.y * sensitivity, -1.45f, 1.45f);

            Vector3 forward = V3(sinf(yaw), 0, cosf(yaw));
            Vector3 right = V3(cosf(yaw), 0, -sinf(yaw));
            Vector3 move = V3(0,0,0);

            if (IsKeyDown(KEY_W)) move = Vector3Add(move, forward);
            if (IsKeyDown(KEY_S)) move = Vector3Subtract(move, forward);
            if (IsKeyDown(KEY_D)) move = Vector3Add(move, right);
            if (IsKeyDown(KEY_A)) move = Vector3Subtract(move, right);

            bool sprinting = IsKeyDown(KEY_LEFT_SHIFT) && Vector3LengthSqr(move) > 0.01f && sprintEnergy > 1.0f;
            float speed = sprinting ? 8.5f : 5.2f;
            if (sprinting) sprintEnergy = std::max(0.0f, sprintEnergy - 28.0f * dt);
            else sprintEnergy = std::min(100.0f, sprintEnergy + 20.0f * dt);

            if (Vector3LengthSqr(move) > 0.01f) {
                move = Vector3Normalize(move);
                Vector3 candidate = player;
                candidate.x += move.x * speed * dt;
                if (CanOccupy(candidate, obstacles)) player.x = candidate.x;
                candidate = player;
                candidate.z += move.z * speed * dt;
                if (CanOccupy(candidate, obstacles)) player.z = candidate.z;
            }

            if (fireCooldown > 0) fireCooldown -= dt;
            if (reloadTimer > 0) {
                reloadTimer -= dt;
                if (reloadTimer <= 0) {
                    int need = 12 - ammo;
                    int loaded = std::min(need, reserve);
                    ammo += loaded;
                    reserve -= loaded;
                    reloading = false;
                }
            }
            if (hitMarker > 0) hitMarker -= dt;
            if (muzzleTimer > 0) muzzleTimer -= dt;
            if (damageFlash > 0) damageFlash -= dt;
            recoil = Lerp(recoil, 0.0f, std::min(1.0f, dt * 16.0f));

            if (IsKeyPressed(KEY_R) && !reloading && ammo < 12 && reserve > 0) {
                reloading = true;
                reloadTimer = 1.05f;
            }

            camera.position = Vector3Add(player, V3(0, 0.62f, 0));
            camera.target = Vector3Add(camera.position, Forward(yaw, pitch));

            if (IsMouseButtonPressed(MOUSE_BUTTON_LEFT) && !reloading && fireCooldown <= 0) {
                if (ammo > 0) {
                    ammo--;
                    fireCooldown = 0.13f;
                    muzzleTimer = 0.07f;
                    recoil = 1.0f;

                    Ray ray = GetScreenToWorldRay(V2(GetScreenWidth()*0.5f, GetScreenHeight()*0.5f), camera);
                    float best = 100000.0f;
                    int bestIndex = -1;
                    for (int i = 0; i < (int)enemies.size(); ++i) {
                        if (!enemies[i].alive) continue;
                        BoundingBox b{
                            V3(enemies[i].pos.x - enemies[i].radius, 0.45f, enemies[i].pos.z - enemies[i].radius),
                            V3(enemies[i].pos.x + enemies[i].radius, 1.35f, enemies[i].pos.z + enemies[i].radius)
                        };
                        RayCollision hit = GetRayCollisionBox(ray, b);
                        if (hit.hit && hit.distance < best) {
                            best = hit.distance;
                            bestIndex = i;
                        }
                    }

                    Vector3 end = Vector3Add(ray.position, Vector3Scale(ray.direction, std::min(best, 65.0f)));
                    if (bestIndex >= 0) {
                        enemies[bestIndex].hp--;
                        enemies[bestIndex].hurtTimer = 0.12f;
                        hitMarker = 0.11f;
                        if (enemies[bestIndex].hp <= 0) {
                            enemies[bestIndex].alive = false;
                            ++kills;
                        }
                    }
                    tracers.push_back({ray.position, end, 0.055f});
                } else if (reserve > 0) {
                    reloading = true;
                    reloadTimer = 1.05f;
                }
            }

            for (auto& t : tracers) t.ttl -= dt;
            tracers.erase(std::remove_if(tracers.begin(), tracers.end(), [](const Tracer& t){ return t.ttl <= 0; }), tracers.end());

            for (auto& e : enemies) {
                if (!e.alive) continue;
                if (e.hurtTimer > 0) e.hurtTimer -= dt;
                e.attackTimer -= dt;

                Vector3 d = Vector3Subtract(player, e.pos);
                d.y = 0;
                float dist = Vector3Length(d);
                if (dist > 1.25f) {
                    d = Vector3Normalize(d);
                    float enemySpeed = 1.25f + wave * 0.18f;
                    Vector3 next = e.pos;
                    next.x += d.x * enemySpeed * dt;
                    next.z += d.z * enemySpeed * dt;
                    bool blocked = false;
                    for (const auto& o : obstacles) {
                        if (CircleVsBox(next, e.radius, o)) { blocked = true; break; }
                    }
                    if (!blocked) e.pos = next;
                } else if (e.attackTimer <= 0) {
                    e.attackTimer = 0.85f;
                    health -= 7.0f + wave * 1.2f;
                    damageFlash = 0.14f;
                    if (health <= 0) state = GameState::Lost;
                }
            }

            if (AliveCount(enemies) == 0) {
                nextWaveTimer += dt;
                if (nextWaveTimer > 1.6f) {
                    if (wave >= MAX_WAVES) state = GameState::Won;
                    else {
                        ++wave;
                        nextWaveTimer = 0;
                        ammo = 12;
                        reserve = std::min(120, reserve + 18);
                        SpawnWave(enemies, wave);
                    }
                }
            } else {
                nextWaveTimer = 0;
            }
        } else if (state == GameState::Paused) {
            EnableCursor();
            mouseLocked = false;
            if (IsKeyPressed(KEY_ESCAPE) || IsKeyPressed(KEY_ENTER)) {
                state = GameState::Playing;
                DisableCursor();
                mouseLocked = true;
            }
        } else {
            EnableCursor();
            mouseLocked = false;
            if (IsKeyPressed(KEY_ENTER) || IsMouseButtonPressed(MOUSE_BUTTON_LEFT)) ResetGame();
            if (IsKeyPressed(KEY_ESCAPE)) break;
        }

        BeginDrawing();
        ClearBackground(Color{7, 10, 15, 255});

        if (state == GameState::Menu) {
            DrawRectangleGradientV(0,0,GetScreenWidth(),GetScreenHeight(), Color{9,17,28,255}, Color{2,4,8,255});
            DrawCenteredText("NEON BREACH", 170, 76, SKYBLUE);
            DrawCenteredText("FIRST-PERSON ARENA FPS", 258, 22, LIGHTGRAY);
            DrawCenteredText("ENTER OR CLICK TO DEPLOY", 390, 28, RAYWHITE);
            DrawCenteredText("WASD MOVE   SHIFT SPRINT   MOUSE AIM/FIRE   R RELOAD   ESC PAUSE", 470, 18, GRAY);
            DrawCenteredText("Survive four escalating waves.", 515, 18, GRAY);
            DrawCenteredText("Built as a native Windows game by Tamasrazim.", 735, 16, DARKGRAY);
        } else {
            BeginMode3D(camera);
            DrawPlane(V3(0,0,0), V2(24,24), Color{17,25,35,255});

            for (int i = -12; i <= 12; ++i) {
                DrawLine3D(V3((float)i,0.01f,-12), V3((float)i,0.01f,12), Color{25,40,52,160});
                DrawLine3D(V3(-12,0.01f,(float)i), V3(12,0.01f,(float)i), Color{25,40,52,160});
            }

            DrawCube(V3(0, 0.8f, -12.5f), 26, 1.6f, 1, Color{20,30,44,255});
            DrawCube(V3(0, 0.8f, 12.5f), 26, 1.6f, 1, Color{20,30,44,255});
            DrawCube(V3(-12.5f, 0.8f, 0), 1, 1.6f, 26, Color{20,30,44,255});
            DrawCube(V3(12.5f, 0.8f, 0), 1, 1.6f, 26, Color{20,30,44,255});

            for (const auto& o : obstacles) {
                DrawCube(o.pos, o.size.x, o.size.y, o.size.z, Color{42,56,74,255});
                DrawCubeWires(o.pos, o.size.x, o.size.y, o.size.z, Color{85,120,150,255});
            }

            for (const auto& e : enemies) if (e.alive) {
                Color c = e.hurtTimer > 0 ? WHITE : (wave >= 3 ? Color{255,90,130,255} : Color{255,70,90,255});
                DrawCube(e.pos, e.radius*2, 1.0f, e.radius*2, c);
                DrawCubeWires(e.pos, e.radius*2.2f, 1.1f, e.radius*2.2f, MAROON);
                DrawSphere(V3(e.pos.x, 1.55f, e.pos.z), 0.12f, GOLD);
            }

            for (const auto& t : tracers) DrawLine3D(t.a, t.b, Color{120,220,255,240});
            EndMode3D();

            DrawRectangle(0,0,GetScreenWidth(),64, Color{3,7,11,220});
            DrawText(TextFormat("WAVE %d / %d", wave, MAX_WAVES), 24, 20, 24, SKYBLUE);
            DrawText(TextFormat("HOSTILES %02d", AliveCount(enemies)), 190, 20, 24, RAYWHITE);
            DrawText(TextFormat("KILLS %03d", kills), 420, 20, 24, LIGHTGRAY);

            DrawRectangle(24, GetScreenHeight()-76, 280, 18, Color{20,25,32,255});
            DrawRectangle(24, GetScreenHeight()-76, (int)(280 * Clamp(health/100.0f, 0, 1)), 18, health > 35 ? GREEN : RED);
            DrawText(TextFormat("HEALTH %03d", (int)std::max(0.0f, health)), 24, GetScreenHeight()-104, 20, RAYWHITE);

            DrawRectangle(24, GetScreenHeight()-42, 220, 10, Color{20,25,32,255});
            DrawRectangle(24, GetScreenHeight()-42, (int)(220 * sprintEnergy/100.0f), 10, SKYBLUE);
            DrawText("SPRINT", 252, GetScreenHeight()-49, 14, GRAY);

            DrawText(TextFormat("%02d", ammo), GetScreenWidth()-185, GetScreenHeight()-90, 58, RAYWHITE);
            DrawText(TextFormat("/ %02d", reserve), GetScreenWidth()-105, GetScreenHeight()-74, 28, LIGHTGRAY);
            if (reloading) DrawText("RELOADING...", GetScreenWidth()-240, GetScreenHeight()-120, 18, SKYBLUE);

            DrawCrosshair(hitMarker > 0);
            DrawBlaster(recoil, muzzleTimer > 0);

            if (damageFlash > 0) DrawRectangle(0,0,GetScreenWidth(),GetScreenHeight(), Color{255,0,40,45});

            if (AliveCount(enemies) == 0 && state == GameState::Playing && wave < MAX_WAVES) {
                DrawCenteredText(TextFormat("WAVE %d CLEARED", wave), 120, 32, SKYBLUE);
                DrawCenteredText("Next wave incoming...", 160, 18, LIGHTGRAY);
            }

            if (state == GameState::Paused) {
                DrawRectangle(0,0,GetScreenWidth(),GetScreenHeight(), Color{0,0,0,150});
                DrawCenteredText("PAUSED", 300, 62, RAYWHITE);
                DrawCenteredText("PRESS ESC OR ENTER TO RESUME", 395, 22, SKYBLUE);
            }

            if (state == GameState::Won || state == GameState::Lost) {
                DrawRectangle(0,0,GetScreenWidth(),GetScreenHeight(), Color{0,0,0,170});
                DrawCenteredText(state == GameState::Won ? "ARENA SECURED" : "SYSTEM OVERRUN", 260, 64, state == GameState::Won ? GREEN : RED);
                DrawCenteredText(TextFormat("KILLS: %d   TIME: %.1fs", kills, elapsed), 360, 24, RAYWHITE);
                DrawCenteredText("ENTER OR CLICK TO RUN AGAIN   •   ESC TO QUIT", 445, 22, LIGHTGRAY);
            }
        }

        EndDrawing();
    }

    if (mouseLocked) EnableCursor();
    CloseWindow();
    return 0;
}

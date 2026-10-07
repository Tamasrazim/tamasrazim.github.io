#include "raylib.h"
#include "raymath.h"

#include <algorithm>
#include <cmath>
#include <vector>

struct BoxObstacle {
    Vector3 pos{};
    Vector3 size{};
};

struct Shard {
    Vector3 pos{};
    bool collected = false;
};

static constexpr float ARENA = 12.0f;
static constexpr float PLAYER_RADIUS = 0.38f;
static constexpr int TOTAL_SHARDS = 20;
static constexpr float ROUND_TIME = 120.0f;

static Vector3 V3(float x, float y, float z) { return {x, y, z}; }

static bool CircleVsBox(Vector3 p, float r, const BoxObstacle& box) {
    Vector3 h = Vector3Scale(box.size, 0.5f);
    float cx = Clamp(p.x, box.pos.x - h.x, box.pos.x + h.x);
    float cz = Clamp(p.z, box.pos.z - h.z, box.pos.z + h.z);
    float dx = p.x - cx, dz = p.z - cz;
    return dx * dx + dz * dz < r * r;
}

static bool CanOccupy(Vector3 p, const std::vector<BoxObstacle>& boxes, const BoxObstacle& movingGate) {
    if (p.x < -ARENA + PLAYER_RADIUS || p.x > ARENA - PLAYER_RADIUS ||
        p.z < -ARENA + PLAYER_RADIUS || p.z > ARENA - PLAYER_RADIUS) return false;
    for (const auto& b : boxes) if (CircleVsBox(p, PLAYER_RADIUS, b)) return false;
    if (CircleVsBox(p, PLAYER_RADIUS, movingGate)) return false;
    return true;
}

static Vector3 ViewDirection(float yaw, float pitch) {
    float cp = cosf(pitch);
    return Vector3Normalize(V3(sinf(yaw) * cp, sinf(pitch), cosf(yaw) * cp));
}

static void CenterText(const char* text, int y, int size, Color color) {
    DrawText(text, (GetScreenWidth() - MeasureText(text, size)) / 2, y, size, color);
}

static void DrawCrosshair() {
    const int x = GetScreenWidth() / 2;
    const int y = GetScreenHeight() / 2;
    DrawLine(x - 9, y, x - 2, y, RAYWHITE);
    DrawLine(x + 2, y, x + 9, y, RAYWHITE);
    DrawLine(x, y - 9, x, y - 2, RAYWHITE);
    DrawLine(x, y + 2, x, y + 9, RAYWHITE);
    DrawCircleLines(x, y, 2, SKYBLUE);
}

static std::vector<Shard> MakeShards() {
    const Vector3 points[TOTAL_SHARDS] = {
        {-9,0.8f,-9},{-5,0.8f,-8},{-1,0.8f,-9},{3,0.8f,-9},{8,0.8f,-8},
        {-9,0.8f,-4},{-6,0.8f,-1},{-3,0.8f,-3},{2,0.8f,-2},{7,0.8f,-4},
        {9,0.8f,0},{6,0.8f,2},{3,0.8f,4},{0,0.8f,3},{-4,0.8f,4},
        {-9,0.8f,5},{-6,0.8f,8},{-2,0.8f,8},{3,0.8f,8},{8,0.8f,7}
    };
    std::vector<Shard> shards;
    shards.reserve(TOTAL_SHARDS);
    for (const auto& p : points) shards.push_back({p, false});
    return shards;
}

int main() {
    SetConfigFlags(FLAG_MSAA_4X_HINT | FLAG_WINDOW_RESIZABLE | FLAG_VSYNC_HINT);
    InitWindow(1440, 900, "NEON VAULT");
    SetExitKey(KEY_NULL);
    SetTargetFPS(144);
    DisableCursor();

    Camera3D camera{};
    camera.up = V3(0,1,0);
    camera.fovy = 70;
    camera.projection = CAMERA_PERSPECTIVE;

    const std::vector<BoxObstacle> walls = {
        {V3(0,1,0), V3(3,2,3)},
        {V3(-5,1,-4), V3(3,2,2)},
        {V3(5,1,4), V3(3,2,2)},
        {V3(-5,1,5), V3(2,2,3)},
        {V3(5,1,-5), V3(2,2,3)},
        {V3(-8,1,1), V3(2,2,4)},
        {V3(8,1,-1), V3(2,2,4)}
    };

    std::vector<Shard> shards = MakeShards();
    Vector3 player = V3(0,1,10);
    float yaw = PI, pitch = 0.0f, verticalVelocity = 0.0f;
    float stamina = 100.0f, timeLeft = ROUND_TIME;
    bool grounded = true;
    bool started = false, paused = false, finished = false, success = false;

    auto Reset = [&]() {
        player = V3(0,1,10);
        yaw = PI; pitch = 0;
        verticalVelocity = 0;
        stamina = 100;
        timeLeft = ROUND_TIME;
        grounded = true;
        paused = false;
        finished = false;
        success = false;
        started = true;
        shards = MakeShards();
        DisableCursor();
    };

    while (!WindowShouldClose()) {
        float dt = std::min(GetFrameTime(), 0.05f);

        float gateX = sinf((float)GetTime() * 1.15f) * 3.8f;
        BoxObstacle movingGate{V3(gateX,1.0f,0), V3(1.0f,2.0f,6.0f)};

        if (!started) {
            EnableCursor();
            if (IsKeyPressed(KEY_ENTER) || IsMouseButtonPressed(MOUSE_BUTTON_LEFT)) Reset();
        } else if (!paused && !finished) {
            if (IsKeyPressed(KEY_ESCAPE)) {
                paused = true;
                EnableCursor();
            }

            Vector2 md = GetMouseDelta();
            yaw -= md.x * 0.0022f;
            pitch = Clamp(pitch + md.y * 0.0022f, -1.4f, 1.4f);

            Vector3 forward = V3(sinf(yaw),0,cosf(yaw));
            Vector3 right = V3(cosf(yaw),0,-sinf(yaw));
            Vector3 move = V3(0,0,0);
            if (IsKeyDown(KEY_W)) move = Vector3Add(move, forward);
            if (IsKeyDown(KEY_S)) move = Vector3Subtract(move, forward);
            if (IsKeyDown(KEY_D)) move = Vector3Add(move, right);
            if (IsKeyDown(KEY_A)) move = Vector3Subtract(move, right);

            bool sprint = IsKeyDown(KEY_LEFT_SHIFT) && Vector3LengthSqr(move) > 0.01f && stamina > 0;
            float speed = sprint ? 8.4f : 5.2f;
            if (sprint) stamina = std::max(0.0f, stamina - 30.0f * dt);
            else stamina = std::min(100.0f, stamina + 22.0f * dt);

            if (Vector3LengthSqr(move) > 0.01f) {
                move = Vector3Normalize(move);
                Vector3 next = player;
                next.x += move.x * speed * dt;
                if (CanOccupy(next, walls, movingGate)) player.x = next.x;
                next = player;
                next.z += move.z * speed * dt;
                if (CanOccupy(next, walls, movingGate)) player.z = next.z;
            }

            if (IsKeyPressed(KEY_SPACE) && grounded) {
                verticalVelocity = 6.1f;
                grounded = false;
            }
            verticalVelocity -= 15.0f * dt;
            player.y += verticalVelocity * dt;
            if (player.y <= 1.0f) {
                player.y = 1.0f;
                verticalVelocity = 0;
                grounded = true;
            }

            timeLeft -= dt;
            if (timeLeft <= 0) {
                timeLeft = 0;
                finished = true;
                success = false;
                EnableCursor();
            }

            for (auto& s : shards) {
                if (!s.collected && Vector3Distance(player, s.pos) < 1.0f) s.collected = true;
            }

            int collected = 0;
            for (const auto& s : shards) if (s.collected) ++collected;

            Vector3 exit = V3(0,1,-10);
            bool atExit = Vector3Distance(player, exit) < 1.5f;
            if (collected == TOTAL_SHARDS && atExit) {
                finished = true;
                success = true;
                EnableCursor();
            }

            camera.position = Vector3Add(player, V3(0,0.62f,0));
            camera.target = Vector3Add(camera.position, ViewDirection(yaw,pitch));
        } else if (paused) {
            EnableCursor();
            if (IsKeyPressed(KEY_ESCAPE) || IsKeyPressed(KEY_ENTER)) {
                paused = false;
                DisableCursor();
            }
        } else {
            EnableCursor();
            if (IsKeyPressed(KEY_ENTER) || IsMouseButtonPressed(MOUSE_BUTTON_LEFT)) Reset();
            if (IsKeyPressed(KEY_ESCAPE)) break;
        }

        BeginDrawing();
        ClearBackground(Color{5,9,16,255});

        if (!started) {
            DrawRectangleGradientV(0,0,GetScreenWidth(),GetScreenHeight(), Color{10,24,40,255}, Color{2,5,10,255});
            CenterText("NEON VAULT", 170, 84, SKYBLUE);
            CenterText("FIRST-PERSON 3D EXPLORATION", 268, 22, LIGHTGRAY);
            CenterText("Collect every crystal, then reach the exit.", 350, 26, RAYWHITE);
            CenterText("ENTER OR CLICK TO START", 430, 28, SKYBLUE);
            CenterText("WASD MOVE   MOUSE LOOK   SHIFT SPRINT   SPACE JUMP   ESC PAUSE", 510, 18, GRAY);
            CenterText("A native Windows build made from code — no external art pack required.", 740, 16, DARKGRAY);
        } else {
            BeginMode3D(camera);

            DrawPlane(V3(0,0,0), Vector2{24,24}, Color{15,23,34,255});
            for (int i=-12;i<=12;i++) {
                DrawLine3D(V3((float)i,0.01f,-12), V3((float)i,0.01f,12), Color{25,44,57,160});
                DrawLine3D(V3(-12,0.01f,(float)i), V3(12,0.01f,(float)i), Color{25,44,57,160});
            }

            DrawCube(V3(0,0.8f,-12.5f),26,1.6f,1,Color{19,31,47,255});
            DrawCube(V3(0,0.8f,12.5f),26,1.6f,1,Color{19,31,47,255});
            DrawCube(V3(-12.5f,0.8f,0),1,1.6f,26,Color{19,31,47,255});
            DrawCube(V3(12.5f,0.8f,0),1,1.6f,26,Color{19,31,47,255});

            for (const auto& b : walls) {
                DrawCube(b.pos,b.size.x,b.size.y,b.size.z,Color{37,54,74,255});
                DrawCubeWires(b.pos,b.size.x,b.size.y,b.size.z,Color{81,128,160,255});
            }

            DrawCube(movingGate.pos,movingGate.size.x,movingGate.size.y,movingGate.size.z,Color{84,45,115,255});
            DrawCubeWires(movingGate.pos,movingGate.size.x,movingGate.size.y,movingGate.size.z,MAGENTA);

            for (const auto& s : shards) if (!s.collected) {
                float bob = 0.18f * sinf((float)GetTime()*3.0f + s.pos.x);
                Vector3 p = Vector3Add(s.pos,V3(0,bob,0));
                DrawSphere(p,0.22f,SKYBLUE);
                DrawSphereWires(p,0.31f,8,12,Color{120,230,255,180});
            }

            Vector3 exit = V3(0,0.05f,-10);
            DrawCylinder(exit,1.3f,1.3f,0.08f,40,success ? GREEN : Color{50,120,150,255});
            DrawCylinderWires(exit,1.5f,1.5f,0.12f,40,RAYWHITE);
            DrawSphere(V3(0,0.7f,-10),0.28f,success ? GREEN : ORANGE);

            EndMode3D();

            int collected = 0;
            for (const auto& s : shards) if (s.collected) ++collected;

            DrawRectangle(0,0,GetScreenWidth(),68,Color{2,6,10,225});
            DrawText(TextFormat("CRYSTALS %02d / %02d",collected,TOTAL_SHARDS),24,21,23,SKYBLUE);
            DrawText(TextFormat("TIME %05.1f",timeLeft),300,21,23,timeLeft < 20 ? ORANGE : RAYWHITE);
            DrawText("EXIT OPENS WHEN ALL CRYSTALS ARE FOUND",GetScreenWidth()-420,24,16,GRAY);

            DrawRectangle(24,GetScreenHeight()-60,260,14,Color{18,25,33,255});
            DrawRectangle(24,GetScreenHeight()-60,(int)(260*stamina/100.0f),14,SKYBLUE);
            DrawText("SPRINT",294,GetScreenHeight()-66,15,GRAY);

            DrawCrosshair();

            if (paused) {
                DrawRectangle(0,0,GetScreenWidth(),GetScreenHeight(),Color{0,0,0,160});
                CenterText("PAUSED",300,64,RAYWHITE);
                CenterText("ESC OR ENTER TO RESUME",390,22,SKYBLUE);
            }

            if (finished) {
                DrawRectangle(0,0,GetScreenWidth(),GetScreenHeight(),Color{0,0,0,175});
                CenterText(success ? "VAULT SECURED" : "TIME EXPIRED",275,68,success ? GREEN : ORANGE);
                CenterText(success ? "Every crystal recovered. The route is complete." : "The vault closed before the collection was finished.",370,22,RAYWHITE);
                CenterText("ENTER OR CLICK TO RUN AGAIN   •   ESC TO QUIT",460,21,LIGHTGRAY);
            }
        }

        EndDrawing();
    }

    EnableCursor();
    CloseWindow();
    return 0;
}

#include "raylib.h"
#include "raymath.h"

#include <algorithm>
#include <array>
#include <cmath>
#include <cstdlib>
#include <fstream>
#include <string>
#include <vector>

enum class Screen { MENU, LEVEL_SELECT, PLAYING, PAUSED, SETTINGS, COMPLETE };
enum class PuzzleType { COLLECT, KEY_DOOR, SWITCH_GATE, PRESSURE_PLATE, MEMORY, TIMED_GATE, TELEPORT, SEQUENCE, MOVING_GATE, FINALE };

struct Settings {
    float sensitivity = 0.0022f;
    bool invertY = false;
    float fov = 70.0f;
    bool hints = true;
    bool shake = true;
    float uiScale = 1.0f;
    int crosshair = 0;
};
struct LevelConfig {
    int number=1, theme=0, tier=0;
    PuzzleType puzzle=PuzzleType::COLLECT;
    int crystals=3, keys=0, switches=0, memoryLength=0, sequenceLength=0;
    int hazards=0, obstacles=4;
    float timeLimit=120.0f;
};
struct Box { Vector3 pos{}, size{}; bool solid=true, moving=false; float phase=0; Vector3 base{}; };
struct Crystal { Vector3 pos{}; bool collected=false; };
struct KeyItem { Vector3 pos{}; int color=0; bool collected=false; };
struct SwitchItem { Vector3 pos{}; bool active=false; };
struct Door { Vector3 pos{}, size{}; bool open=false; };
struct Crate { Vector3 pos{}; Vector3 size{1.1f,1.1f,1.1f}; };
struct Plate { Vector3 pos{}; bool active=false; };
struct Pad { Vector3 pos{}; int id=0, target=-1; bool active=false; };
struct Hazard { Vector3 pos{}, size{}; float phase=0; bool moving=false; };
struct SaveData { int unlocked=1; std::array<int,101> stars{}; Settings settings{}; };

static constexpr int LEVELS=100;
static constexpr float PLAYER_RADIUS=0.36f;
static Vector3 V3(float x,float y,float z){return {x,y,z};}

static Color ThemePrimary(int theme){
    static const std::array<Color,10> c={
        Color{70,205,255,255},Color{125,105,255,255},Color{65,235,175,255},
        Color{255,190,75,255},Color{255,90,145,255},Color{185,110,255,255},
        Color{80,230,230,255},Color{255,125,65,255},Color{135,220,100,255},
        Color{235,235,255,255}
    };
    return c[theme%10];
}
static Color KeyColor(int i){
    static const std::array<Color,4> c={
        Color{70,205,255,255},Color{255,120,90,255},
        Color{120,230,125,255},Color{195,120,255,255}
    };
    return c[i%4];
}
static const char* PuzzleName(PuzzleType t){
    switch(t){
        case PuzzleType::COLLECT:return "COLLECT";
        case PuzzleType::KEY_DOOR:return "KEY + DOOR";
        case PuzzleType::SWITCH_GATE:return "SWITCH GATE";
        case PuzzleType::PRESSURE_PLATE:return "PRESSURE";
        case PuzzleType::MEMORY:return "MEMORY";
        case PuzzleType::TIMED_GATE:return "TIMED";
        case PuzzleType::TELEPORT:return "TELEPORT";
        case PuzzleType::SEQUENCE:return "SEQUENCE";
        case PuzzleType::MOVING_GATE:return "MOVING GATE";
        case PuzzleType::FINALE:return "FINALE";
    }
    return "UNKNOWN";
}
static LevelConfig MakeLevel(int n){
    n=std::clamp(n,1,LEVELS);
    int tier=(n-1)/10, sub=(n-1)%10;
    static const std::array<PuzzleType,10> types={
        PuzzleType::COLLECT,PuzzleType::KEY_DOOR,PuzzleType::SWITCH_GATE,
        PuzzleType::PRESSURE_PLATE,PuzzleType::MEMORY,PuzzleType::TIMED_GATE,
        PuzzleType::TELEPORT,PuzzleType::SEQUENCE,PuzzleType::MOVING_GATE,PuzzleType::FINALE
    };
    LevelConfig c;
    c.number=n;c.theme=sub;c.tier=tier;c.puzzle=types[sub];
    c.crystals=3+std::min(3,tier/2);
    c.obstacles=3+tier*2+sub/2;
    c.hazards=tier==0?0:1+tier/2+sub/4;
    c.timeLimit=145.0f-tier*8.0f-sub*1.5f;
    if(c.puzzle==PuzzleType::KEY_DOOR||c.puzzle==PuzzleType::FINALE)c.keys=1+tier/4;
    if(c.puzzle==PuzzleType::SWITCH_GATE||c.puzzle==PuzzleType::TIMED_GATE||c.puzzle==PuzzleType::FINALE)c.switches=1+tier/5;
    if(c.puzzle==PuzzleType::MEMORY||c.puzzle==PuzzleType::FINALE)c.memoryLength=3+tier/2+sub/4;
    if(c.puzzle==PuzzleType::SEQUENCE||c.puzzle==PuzzleType::FINALE)c.sequenceLength=3+tier/3+sub/3;
    if(c.puzzle==PuzzleType::TELEPORT)c.crystals=std::max(4,c.crystals);
    if(c.puzzle==PuzzleType::FINALE){c.obstacles+=4;c.hazards+=2;c.timeLimit-=8;}
    if(n==100){c.puzzle=PuzzleType::FINALE;c.crystals=6;c.keys=2;c.switches=2;c.memoryLength=7;c.sequenceLength=8;c.obstacles=24;c.hazards=8;c.timeLimit=210;}
    return c;
}
static std::string SavePath(){
    const char* a=std::getenv("LOCALAPPDATA");
    if(a&&a[0]){
        std::string d=std::string(a)+"\\Tamasrazim";
        MakeDirectory(d.c_str());
        return d+"\\NeonVault.cfg";
    }
    return "NeonVault.cfg";
}
static void SaveGame(const SaveData& d){
    std::ofstream o(SavePath(),std::ios::trunc);if(!o)return;
    o<<"unlocked "<<d.unlocked<<"\n";
    o<<"sensitivity "<<d.settings.sensitivity<<"\n";
    o<<"invertY "<<(d.settings.invertY?1:0)<<"\n";
    o<<"fov "<<d.settings.fov<<"\n";
    o<<"hints "<<(d.settings.hints?1:0)<<"\n";
    o<<"shake "<<(d.settings.shake?1:0)<<"\n";
    o<<"uiScale "<<d.settings.uiScale<<"\n";
    o<<"crosshair "<<d.settings.crosshair<<"\n";
    for(int i=1;i<=LEVELS;i++)o<<"star "<<i<<" "<<d.stars[i]<<"\n";
}
static SaveData LoadGame(){
    SaveData d;std::ifstream in(SavePath());if(!in)return d;
    std::string k;
    while(in>>k){
        if(k=="unlocked")in>>d.unlocked;
        else if(k=="sensitivity")in>>d.settings.sensitivity;
        else if(k=="invertY"){int v;in>>v;d.settings.invertY=v!=0;}
        else if(k=="fov")in>>d.settings.fov;
        else if(k=="hints"){int v;in>>v;d.settings.hints=v!=0;}
        else if(k=="shake"){int v;in>>v;d.settings.shake=v!=0;}
        else if(k=="uiScale")in>>d.settings.uiScale;
        else if(k=="crosshair")in>>d.settings.crosshair;
        else if(k=="star"){int n=0,s=0;in>>n>>s;if(n>=1&&n<=LEVELS)d.stars[n]=std::clamp(s,0,3);}
    }
    d.unlocked=std::clamp(d.unlocked,1,LEVELS);
    d.settings.sensitivity=Clamp(d.settings.sensitivity,0.0008f,0.005f);
    d.settings.fov=Clamp(d.settings.fov,60.0f,100.0f);
    d.settings.uiScale=Clamp(d.settings.uiScale,0.85f,1.2f);
    d.settings.crosshair=std::clamp(d.settings.crosshair,0,2);
    return d;
}
static bool HitsBox(Vector3 p,float r,Vector3 c,Vector3 s){
    Vector3 h=Vector3Scale(s,0.5f);
    float x=Clamp(p.x,c.x-h.x,c.x+h.x),z=Clamp(p.z,c.z-h.z,c.z+h.z);
    float dx=p.x-x,dz=p.z-z;
    return dx*dx+dz*dz<r*r;
}
static Vector3 ViewDirection(float yaw,float pitch){
    float cp=cosf(pitch);
    return Vector3Normalize(V3(sinf(yaw)*cp,sinf(pitch),cosf(yaw)*cp));
}
static void CenterText(const char* t,int y,int size,Color c){DrawText(t,(GetScreenWidth()-MeasureText(t,size))/2,y,size,c);}
static void CrystalIcon(Vector2 p,float s,Color c){
    Vector2 a={p.x,p.y-s},b={p.x+s*0.65f,p.y},d={p.x,p.y+s},e={p.x-s*0.65f,p.y};
    DrawTriangle(a,b,d,c);DrawTriangle(a,d,e,c);DrawLineV(a,d,WHITE);
}
static void KeyIcon(Vector2 p,float s,Color c){
    DrawCircleV(p,s*0.28f,c);DrawCircleV(p,s*0.11f,Color{8,12,20,255});
    DrawRectangle((int)(p.x+s*0.18f),(int)(p.y-s*0.08f),(int)(s*0.75f),(int)(s*0.16f),c);
    DrawRectangle((int)(p.x+s*0.70f),(int)(p.y-s*0.08f),(int)(s*0.12f),(int)(s*0.30f),c);
}
static void SwitchIcon(Vector2 p,float s,bool on){
    Color c=on?GREEN:Color{70,85,100,255};
    DrawRectangleRounded({p.x-s,p.y-s*0.60f,s*2,s*1.2f},0.25f,8,c);
    DrawCircleV({p.x+(on?s*0.52f:-s*0.52f),p.y},s*0.40f,RAYWHITE);
}
static void ClockIcon(Vector2 p,float s,Color c){
    DrawCircleLines((int)p.x,(int)p.y,s,c);
    DrawLine((int)p.x,(int)p.y,(int)p.x,(int)(p.y-s*0.5f),c);
    DrawLine((int)p.x,(int)p.y,(int)(p.x+s*0.32f),(int)(p.y+s*0.22f),c);
}
static void StarIcon(Vector2 p,float r,Color c){
    Vector2 pts[10];
    for(int i=0;i<10;i++){
        float a=-PI/2+i*PI/5,rr=(i%2==0)?r:r*0.42f;
        pts[i]={p.x+cosf(a)*rr,p.y+sinf(a)*rr};
    }
    DrawPoly(p,10,r,-90,c);
    for(int i=0;i<10;i++)DrawLineV(pts[i],pts[(i+1)%10],c);
}
static void Button(Rectangle r,const char* label,bool hover,Color accent){
    DrawRectangleRounded(r,.18f,10,hover?Color{24,42,60,255}:Color{12,22,34,255});
    DrawRectangleRoundedLines(r,.18f,10,hover?accent:Color{45,69,89,255});
    int fs=22,w=MeasureText(label,fs);
    DrawText(label,(int)(r.x+(r.width-w)/2),(int)(r.y+(r.height-fs)/2-1),fs,RAYWHITE);
}
static int MemoryWanted(int level,int step,int length){
    return length?((level*31+step*17+step*step*7)%length):0;
}

int main(){
    SetConfigFlags(FLAG_MSAA_4X_HINT|FLAG_WINDOW_RESIZABLE|FLAG_VSYNC_HINT);
    InitWindow(1440,900,"NEON VAULT");
    SetExitKey(KEY_NULL);
    SetTargetFPS(144);

    SaveData save=LoadGame();
    Settings& settings=save.settings;
    Screen screen=Screen::MENU;
    int settingsSelected=0,levelNumber=1;
    LevelConfig level{};
    Camera3D cam{};
    cam.up=V3(0,1,0);
    cam.projection=CAMERA_PERSPECTIVE;

    std::vector<Box>walls;
    std::vector<Crystal>crystals;
    std::vector<KeyItem>keys;
    std::vector<SwitchItem>switches;
    std::vector<Door>doors;
    std::vector<Crate>crates;
    std::vector<Plate>plates;
    std::vector<Pad>pads;
    std::vector<Hazard>hazards;

    Vector3 player{},checkpoint{};
    float yaw=PI,pitch=0,vy=0,stamina=100,timeLeft=0,startTime=0;
    float respawnFlash=0,teleportCooldown=0,timedGate=0,memoryFlash=0;
    int memoryProgress=0,sequenceProgress=0,hitsTaken=0;
    bool grounded=true,memoryShowing=false;
    bool keysSolved=false,switchesSolved=false,platesSolved=false,memorySolved=false,sequenceSolved=false,puzzleSolved=false;

    auto GenerateLevel=[&](int n){
        level=MakeLevel(n);
        walls.clear();crystals.clear();keys.clear();switches.clear();doors.clear();crates.clear();plates.clear();pads.clear();hazards.clear();
        player=V3(0,1,10);checkpoint=player;yaw=PI;pitch=0;vy=0;stamina=100;
        timeLeft=level.timeLimit;startTime=level.timeLimit;respawnFlash=0;teleportCooldown=0;timedGate=0;
        memoryProgress=0;sequenceProgress=0;hitsTaken=0;grounded=true;
        memoryShowing=level.memoryLength>0;memoryFlash=memoryShowing?1.5f:0;
        keysSolved=level.keys==0;switchesSolved=level.switches==0;
        platesSolved=!(level.puzzle==PuzzleType::PRESSURE_PLATE||level.puzzle==PuzzleType::FINALE);
        memorySolved=level.memoryLength==0;sequenceSolved=level.sequenceLength==0;puzzleSolved=false;

        walls.push_back({V3(0,.8f,-12.5f),V3(26,1.6f,1),true});
        walls.push_back({V3(0,.8f,12.5f),V3(26,1.6f,1),true});
        walls.push_back({V3(-12.5f,.8f,0),V3(1,1.6f,26),true});
        walls.push_back({V3(12.5f,.8f,0),V3(1,1.6f,26),true});

        unsigned seed=0x9E3779B9u^(unsigned)(n*2654435761u);
        auto rng=[&](){seed^=seed<<13;seed^=seed>>17;seed^=seed<<5;return seed;};
        auto rnd=[&](float a,float b){return a+(float)(rng()%10000)/10000.0f*(b-a);};

        for(int i=0;i<level.obstacles;i++){
            float x=rnd(-9,9),z=rnd(-7.2f,7);
            if(fabsf(x)<2.4f&&z>4)z-=4;
            if(fabsf(x)<2.2f&&fabsf(z)<2.2f)x+=(x>=0?3.0f:-3.0f);
            walls.push_back({V3(x,1,z),V3(1.2f+rnd(0,2),2,1.2f+rnd(0,2.3f)),true});
        }
        if(level.tier>=7)for(int i=0;i<level.tier-6;i++)
            walls.push_back({V3(0,1,-7.5f+i*2.1f),V3(.8f,2,4.4f),true});

        if(level.puzzle==PuzzleType::MOVING_GATE||level.puzzle==PuzzleType::FINALE){
            for(int i=0;i<1+level.tier/4;i++){
                Box b{V3(0,1,-6+i*4.0f),V3(.9f,2,5),true,true,i*1.3f};
                b.base=b.pos;walls.push_back(b);
            }
        }

        for(int i=0;i<level.crystals;i++){
            float a=(float)i/level.crystals*(2.0f*PI)+n*.37f;
            float r=2.8f+(i%3)*2+level.tier*.25f;
            crystals.push_back({V3(cosf(a)*r,.85f,sinf(a)*r),false});
        }

        for(int i=0;i<level.keys;i++)keys.push_back({V3(-7.5f+i*4.6f,.9f,5.5f-i*1.3f),i,false});
        for(int i=0;i<level.keys;i++)doors.push_back({V3(-4.8f+i*6,1,-5+i*1.2f),V3(1,2,3),false});

        for(int i=0;i<level.switches;i++)switches.push_back({V3(-7.5f+i*6.5f,.8f,-1.5f+i*3),false});
        if(!switches.empty()&&level.puzzle!=PuzzleType::TIMED_GATE)
            doors.push_back({V3(6,1,-3),V3(1,2,4),false});

        if(level.puzzle==PuzzleType::PRESSURE_PLATE||level.puzzle==PuzzleType::FINALE){
            platesSolved=false;
            int count=1+level.tier/4;
            for(int i=0;i<count;i++){
                plates.push_back({V3(-5+i*5,.06f,2+i*1.1f),false});
                Crate crate;crate.pos=V3(-6+i*3,.62f,5.3f-i);crates.push_back(crate);
            }
            doors.push_back({V3(0,1,-4.2f),V3(4.5f,2,.8f),false});
        }

        if(level.memoryLength>0)for(int i=0;i<std::max(4,level.memoryLength);i++){
            float x=-5.5f+(i%4)*3.7f,z=5.2f-(i/4)*3.4f;
            pads.push_back({V3(x,.05f,z),i,-1,false});
        }

        if(level.puzzle==PuzzleType::TELEPORT){
            pads.push_back({V3(-8,.05f,7),0,1,false});
            pads.push_back({V3(7.5f,.05f,-7),1,0,false});
            if(level.tier>=4){
                pads.push_back({V3(7,.05f,7),2,3,false});
                pads.push_back({V3(-7,.05f,-6),3,2,false});
            }
        }

        if(level.sequenceLength>0)for(int i=0;i<std::max(5,level.sequenceLength);i++){
            float x=-7.5f+(i%5)*3.8f,z=2-(i/5)*4;
            pads.push_back({V3(x,.05f,z),100+i,-1,false});
        }

        for(int i=0;i<level.hazards;i++){
            Hazard h;
            h.pos=V3(rnd(-8,8),.35f,rnd(-7,7));
            h.size=V3(.5f+rnd(0,.55f),.7f,2.5f);
            h.phase=rnd(0,(2.0f*PI));h.moving=level.tier>=3;hazards.push_back(h);
        }

        cam.fovy=settings.fov;
        DisableCursor();
        screen=Screen::PLAYING;
    };

    auto StartLevel=[&](int n){levelNumber=std::clamp(n,1,LEVELS);GenerateLevel(levelNumber);};
    auto Respawn=[&](){player=checkpoint;vy=0;grounded=true;timeLeft=std::max(0.0f,timeLeft-4);hitsTaken++;respawnFlash=.3f;};

    while(!WindowShouldClose()){
        float dt=std::min(GetFrameTime(),.05f);
        bool click=IsMouseButtonPressed(MOUSE_BUTTON_LEFT);

        if(screen==Screen::MENU){
            EnableCursor();
            Rectangle a{GetScreenWidth()/2.0f-170,370,340,58},b{GetScreenWidth()/2.0f-170,442,340,58},c{GetScreenWidth()/2.0f-170,514,340,58},d{GetScreenWidth()/2.0f-170,586,340,58};
            if(IsKeyPressed(KEY_ENTER)||(CheckCollisionPointRec(GetMousePosition(),a)&&click))StartLevel(save.unlocked);
            else if(IsKeyPressed(KEY_L)||(CheckCollisionPointRec(GetMousePosition(),b)&&click))screen=Screen::LEVEL_SELECT;
            else if(IsKeyPressed(KEY_S)||(CheckCollisionPointRec(GetMousePosition(),c)&&click))screen=Screen::SETTINGS;
            else if(IsKeyPressed(KEY_ESCAPE)||(CheckCollisionPointRec(GetMousePosition(),d)&&click))break;
        } else if(screen==Screen::LEVEL_SELECT){
            EnableCursor();
            if(IsKeyPressed(KEY_ESCAPE))screen=Screen::MENU;
            int cell=62,startX=(GetScreenWidth()-620)/2,startY=155;
            if(click){
                Vector2 m=GetMousePosition();
                for(int i=0;i<LEVELS;i++){
                    int n=i+1,x=startX+(i%10)*cell,y=startY+(i/10)*cell;
                    Rectangle r{(float)x+3,(float)y+3,56,56};
                    if(n<=save.unlocked&&CheckCollisionPointRec(m,r)){StartLevel(n);break;}
                }
            }
        } else if(screen==Screen::SETTINGS){
            EnableCursor();
            if(IsKeyPressed(KEY_ESCAPE)){SaveGame(save);screen=Screen::MENU;}
            if(IsKeyPressed(KEY_TAB)||IsKeyPressed(KEY_S))settingsSelected=(settingsSelected+1)%7;
            if(IsKeyPressed(KEY_UP))settingsSelected=(settingsSelected+6)%7;
            if(IsKeyPressed(KEY_DOWN))settingsSelected=(settingsSelected+1)%7;
            int dir=(IsKeyPressed(KEY_RIGHT)?1:0)-(IsKeyPressed(KEY_LEFT)?1:0);
            if(dir){
                if(settingsSelected==0)settings.sensitivity=Clamp(settings.sensitivity+dir*.0002f,.0008f,.005f);
                if(settingsSelected==1)settings.invertY=!settings.invertY;
                if(settingsSelected==2)settings.fov=Clamp(settings.fov+dir*2,60,100);
                if(settingsSelected==3)settings.hints=!settings.hints;
                if(settingsSelected==4)settings.shake=!settings.shake;
                if(settingsSelected==5)settings.uiScale=Clamp(settings.uiScale+dir*.05f,.85f,1.2f);
                if(settingsSelected==6)settings.crosshair=(settings.crosshair+(dir>0?1:2))%3;
                SaveGame(save);
            }
        } else if(screen==Screen::PLAYING){
            if(IsKeyPressed(KEY_ESCAPE)){screen=Screen::PAUSED;EnableCursor();}
            Vector2 md=GetMouseDelta();
            yaw-=md.x*settings.sensitivity;
            pitch+=(settings.invertY?md.y:-md.y)*settings.sensitivity;
            pitch=Clamp(pitch,-1.42f,1.42f);

            if(IsKeyPressed(KEY_E)){
                for(auto& s:switches)if(Vector3Distance(player,s.pos)<1.5f)s.active=!s.active;
                if(level.puzzle==PuzzleType::TIMED_GATE&&!switches.empty()&&switches[0].active){timedGate=8;switches[0].active=false;}
                if(!memoryShowing){
                    for(auto& p:pads)if(p.id>=0&&p.id<level.memoryLength&&Vector3Distance(player,p.pos)<.85f){
                        int wanted=MemoryWanted(level.number,memoryProgress,level.memoryLength);
                        if(p.id==wanted)memoryProgress++;else{memoryProgress=0;Respawn();}
                        if(memoryProgress>=level.memoryLength)memorySolved=true;
                    }
                }
            }

            if(teleportCooldown>0)teleportCooldown-=dt;
            if(timedGate>0)timedGate-=dt;
            if(respawnFlash>0)respawnFlash-=dt;
            if(memoryShowing){memoryFlash-=dt;if(memoryFlash<=0)memoryShowing=false;}

            Vector3 f=V3(sinf(yaw),0,cosf(yaw)),r=V3(cosf(yaw),0,-sinf(yaw)),m=V3(0,0,0);
            if(IsKeyDown(KEY_W))m=Vector3Add(m,f);
            if(IsKeyDown(KEY_S))m=Vector3Subtract(m,f);
            if(IsKeyDown(KEY_D))m=Vector3Add(m,r);
            if(IsKeyDown(KEY_A))m=Vector3Subtract(m,r);

            bool sprint=IsKeyDown(KEY_LEFT_SHIFT)&&Vector3LengthSqr(m)>.01f&&stamina>0;
            float speed=sprint?8.5f:5.0f;
            stamina=Clamp(stamina+(sprint?-32.0f:22.0f)*dt,0,100);

            if(Vector3LengthSqr(m)>.01f){
                m=Vector3Normalize(m);
                Vector3 step=Vector3Scale(m,speed*dt),next=Vector3Add(player,step);
                bool blocked=false;
                for(const auto& b:walls)if(HitsBox(next,PLAYER_RADIUS,b.pos,b.size)){blocked=true;break;}
                for(const auto& d:doors)if(!d.open&&HitsBox(next,PLAYER_RADIUS,d.pos,d.size)){blocked=true;break;}
                if(blocked)for(auto& c:crates)if(HitsBox(next,PLAYER_RADIUS+.15f,c.pos,c.size)){
                    Vector3 cn=Vector3Add(c.pos,step);bool cb=false;
                    for(const auto& b:walls)if(HitsBox(cn,.5f,b.pos,b.size)){cb=true;break;}
                    if(!cb){c.pos=cn;blocked=false;break;}
                }
                if(!blocked)player=next;
            }

            if(IsKeyPressed(KEY_SPACE)&&grounded){vy=6;grounded=false;}
            vy-=15*dt;player.y+=vy*dt;
            if(player.y<=1){player.y=1;vy=0;grounded=true;}
            timeLeft-=dt;

            int collected=0;
            for(auto& c:crystals)if(!c.collected&&Vector3Distance(player,c.pos)<1.15f)c.collected=true;
            for(const auto& c:crystals)if(c.collected)collected++;
            if(collected>=std::max(1,level.crystals/2))checkpoint=player;

            for(auto& k:keys)if(!k.collected&&Vector3Distance(player,k.pos)<1)k.collected=true;
            keysSolved=keys.empty();
            for(const auto& k:keys)if(!k.collected)keysSolved=false;
            if(keysSolved)for(auto& d:doors)d.open=true;

            switchesSolved=switches.empty();
            if(!switches.empty()){switchesSolved=true;for(const auto& s:switches)if(!s.active)switchesSolved=false;}

            platesSolved=plates.empty();
            if(!plates.empty()){
                platesSolved=true;
                for(auto& p:plates){
                    p.active=Vector3Distance(player,p.pos)<.8f;
                    for(const auto& c:crates)if(Vector3Distance(c.pos,p.pos)<.9f)p.active=true;
                    if(!p.active)platesSolved=false;
                }
                if(platesSolved)for(auto& d:doors)d.open=true;
            }

            if(level.memoryLength>0&&!memoryShowing&&!memorySolved&&memoryProgress>=level.memoryLength)memorySolved=true;
            if(level.sequenceLength>0){
                int expected=100+sequenceProgress;
                for(auto& p:pads)if(p.id==expected&&Vector3Distance(player,p.pos)<.85f){p.active=true;sequenceProgress++;}
                if(sequenceProgress>=level.sequenceLength)sequenceSolved=true;
            }

            if(level.puzzle==PuzzleType::TELEPORT&&teleportCooldown<=0)for(const auto& p:pads)if(p.id<100&&p.target>=0&&p.target<(int)pads.size()&&Vector3Distance(player,p.pos)<.9f){
                player=Vector3Add(pads[p.target].pos,V3(0,1,0));checkpoint=player;teleportCooldown=.8f;break;
            }

            float now=(float)GetTime();
            for(auto& b:walls)if(b.moving)b.pos.x=b.base.x+sinf(now*(1+level.tier*.06f)+b.phase)*4;
            for(const auto& h:hazards){
                Vector3 hp=h.pos;if(h.moving)hp.x+=sinf(now*1.3f+h.phase)*4.5f;
                if(HitsBox(player,PLAYER_RADIUS+.05f,hp,h.size)){Respawn();break;}
            }

            if(level.puzzle==PuzzleType::TIMED_GATE)puzzleSolved=timedGate>0;
            else if(level.puzzle==PuzzleType::COLLECT||level.puzzle==PuzzleType::MOVING_GATE||level.puzzle==PuzzleType::TELEPORT)puzzleSolved=true;
            else if(level.puzzle==PuzzleType::KEY_DOOR)puzzleSolved=keysSolved;
            else if(level.puzzle==PuzzleType::SWITCH_GATE)puzzleSolved=switchesSolved;
            else if(level.puzzle==PuzzleType::PRESSURE_PLATE)puzzleSolved=platesSolved;
            else if(level.puzzle==PuzzleType::MEMORY)puzzleSolved=memorySolved;
            else if(level.puzzle==PuzzleType::SEQUENCE)puzzleSolved=sequenceSolved;
            else puzzleSolved=keysSolved&&switchesSolved&&platesSolved&&memorySolved&&sequenceSolved;

            Vector3 exit=V3(0,1,-9.4f);
            if(puzzleSolved&&collected>=level.crystals&&Vector3Distance(player,exit)<1.7f){
                float ratio=startTime>0?timeLeft/startTime:0;
                int stars=(ratio>.55f&&hitsTaken<=1)?3:(ratio>.22f?2:1);
                save.stars[level.number]=std::max(save.stars[level.number],stars);
                if(level.number<LEVELS)save.unlocked=std::max(save.unlocked,level.number+1);
                SaveGame(save);
                if(level.number==LEVELS){screen=Screen::COMPLETE;EnableCursor();}
                else{screen=Screen::LEVEL_SELECT;EnableCursor();}
            }
            if(timeLeft<=0){timeLeft=0;screen=Screen::PAUSED;EnableCursor();}

            cam.position=Vector3Add(player,V3(0,.62f,0));
            cam.target=Vector3Add(cam.position,ViewDirection(yaw,pitch));
            cam.fovy=settings.fov;
        } else if(screen==Screen::PAUSED){
            EnableCursor();
            if(IsKeyPressed(KEY_ESCAPE)){screen=Screen::PLAYING;DisableCursor();}
            else if(IsKeyPressed(KEY_R))StartLevel(level.number);
            else if(IsKeyPressed(KEY_S))screen=Screen::SETTINGS;
        } else if(screen==Screen::COMPLETE){
            EnableCursor();
            if(IsKeyPressed(KEY_ENTER)||click)screen=Screen::LEVEL_SELECT;
            if(IsKeyPressed(KEY_ESCAPE))screen=Screen::MENU;
        }

        BeginDrawing();
        ClearBackground(Color{5,9,16,255});

        if(screen==Screen::MENU){
            DrawRectangleGradientV(0,0,GetScreenWidth(),GetScreenHeight(),Color{10,24,40,255},Color{2,5,10,255});
            DrawCircle(GetScreenWidth()/2,168,80,Color{15,50,78,255});
            CrystalIcon({GetScreenWidth()/2.0f,168},44,SKYBLUE);
            CenterText("NEON VAULT",244,74,RAYWHITE);
            CenterText("100-LEVEL FIRST-PERSON PUZZLE ADVENTURE",326,20,LIGHTGRAY);
            float x=GetScreenWidth()/2.0f-170;
            Rectangle a{x,370,340,58},b{x,442,340,58},c{x,514,340,58},d{x,586,340,58};
            Button(a,"CONTINUE",CheckCollisionPointRec(GetMousePosition(),a),SKYBLUE);
            Button(b,"LEVEL SELECT",CheckCollisionPointRec(GetMousePosition(),b),SKYBLUE);
            Button(c,"SETTINGS",CheckCollisionPointRec(GetMousePosition(),c),SKYBLUE);
            Button(d,"QUIT",CheckCollisionPointRec(GetMousePosition(),d),SKYBLUE);
            CrystalIcon({x+27,399},10,SKYBLUE);SwitchIcon({x+27,471},11,true);ClockIcon({x+27,543},10,SKYBLUE);
            DrawText(TextFormat("PROGRESS %03d / %03d",save.unlocked,LEVELS),x+78,670,18,LIGHTGRAY);
        } else if(screen==Screen::LEVEL_SELECT){
            DrawRectangleGradientV(0,0,GetScreenWidth(),GetScreenHeight(),Color{7,14,24,255},Color{2,5,9,255});
            DrawText("LEVEL SELECT",42,38,34,RAYWHITE);
            DrawText(TextFormat("%03d / %03d UNLOCKED",save.unlocked,LEVELS),44,82,17,LIGHTGRAY);
            DrawText("ESC BACK",GetScreenWidth()-120,50,15,GRAY);
            int cell=62,startX=(GetScreenWidth()-620)/2,startY=155;
            for(int i=0;i<LEVELS;i++){
                int n=i+1,x=startX+(i%10)*cell,y=startY+(i/10)*cell;
                Rectangle r{(float)x+3,(float)y+3,56,56};bool u=n<=save.unlocked,h=CheckCollisionPointRec(GetMousePosition(),r);
                DrawRectangleRounded(r,.18f,7,u?(h?Color{23,45,62,255}:Color{12,25,37,255}):Color{14,20,28,255});
                DrawRectangleRoundedLines(r,.18f,7,u?ThemePrimary(i):Color{35,44,52,255});
                DrawText(TextFormat("%02d",n),(int)r.x+14,(int)r.y+7,18,u?RAYWHITE:DARKGRAY);
                for(int s=0;s<3;s++)StarIcon({r.x+16+s*12,r.y+43},5,s<save.stars[n]?GOLD:Color{45,52,60,255});
            }
            CenterText("Rows become harder. Columns rotate through the puzzle families.",810,16,GRAY);
        } else if(screen==Screen::SETTINGS){
            DrawRectangleGradientV(0,0,GetScreenWidth(),GetScreenHeight(),Color{7,14,24,255},Color{2,5,9,255});
            DrawText("SETTINGS",46,38,34,RAYWHITE);
            DrawText("TAB/S NEXT • ARROWS CHANGE • ESC SAVE + BACK",48,82,16,GRAY);
            const char* labels[7]={"Mouse sensitivity","Invert Y","Field of view","Hints","Screen shake","UI scale","Crosshair"};
            std::string vals[7]={
                TextFormat("%.4f",settings.sensitivity),settings.invertY?"ON":"OFF",
                TextFormat("%.0f",settings.fov),settings.hints?"ON":"OFF",
                settings.shake?"ON":"OFF",TextFormat("%.2fx",settings.uiScale),
                TextFormat("STYLE %d",settings.crosshair+1)
            };
            for(int i=0;i<7;i++){
                float y=145+i*76;Rectangle r{60,y,520,60};
                DrawRectangleRounded(r,.18f,10,i==settingsSelected?Color{20,38,54,255}:Color{11,21,31,255});
                DrawRectangleRoundedLines(r,.18f,10,i==settingsSelected?SKYBLUE:Color{42,58,72,255});
                DrawText(labels[i],84,(int)y+17,20,RAYWHITE);
                DrawText(vals[i].c_str(),430,(int)y+17,20,SKYBLUE);
            }
            DrawText("Mouse up looks up by default.",650,190,18,LIGHTGRAY);
            DrawText("Invert Y reverses the vertical axis.",650,220,18,LIGHTGRAY);
            ClockIcon({790,335},44,SKYBLUE);SwitchIcon({790,470},50,settings.invertY);KeyIcon({790,605},55,ThemePrimary(levelNumber-1));
        } else if(screen==Screen::PLAYING||screen==Screen::PAUSED){
            BeginMode3D(cam);
            DrawPlane(V3(0,0,0),Vector2{24,24},Color{15,23,34,255});
            for(int i=-12;i<=12;i++){
                DrawLine3D(V3((float)i,.01f,-12),V3((float)i,.01f,12),Color{25,44,57,140});
                DrawLine3D(V3(-12,.01f,(float)i),V3(12,.01f,(float)i),Color{25,44,57,140});
            }
            for(const auto& b:walls){
                Color c=b.moving?Color{55,30,85,255}:Color{31,48,67,255};
                DrawCube(b.pos,b.size.x,b.size.y,b.size.z,c);
                DrawCubeWires(b.pos,b.size.x,b.size.y,b.size.z,b.moving?MAGENTA:Color{74,118,148,255});
            }
            for(const auto& d:doors)if(!d.open){
                DrawCube(d.pos,d.size.x,d.size.y,d.size.z,Color{95,54,40,255});
                DrawCubeWires(d.pos,d.size.x,d.size.y,d.size.z,ORANGE);
            }
            for(const auto& c:crates){DrawCube(c.pos,c.size.x,c.size.y,c.size.z,Color{126,93,54,255});DrawCubeWires(c.pos,c.size.x,c.size.y,c.size.z,BEIGE);}
            for(const auto& p:plates){DrawCylinder(p.pos,.6f,.6f,.08f,24,p.active?GREEN:Color{74,83,92,255});DrawCylinderWires(p.pos,.66f,.66f,.1f,24,p.active?GREEN:GRAY);}
            for(const auto& s:switches){DrawCube(s.pos,.65f,.9f,.3f,s.active?GREEN:Color{100,40,45,255});DrawCubeWires(s.pos,.7f,.95f,.35f,RAYWHITE);}
            for(const auto& k:keys)if(!k.collected){DrawCylinder(k.pos,.25f,.25f,.08f,16,KeyColor(k.color));DrawCylinderWires(k.pos,.28f,.28f,.09f,16,RAYWHITE);}
            for(const auto& c:crystals)if(!c.collected){float bob=.16f*sinf((float)GetTime()*3+c.pos.x);Vector3 p=V3(c.pos.x,c.pos.y+bob,c.pos.z);DrawSphere(p,.28f,ThemePrimary(level.theme));DrawSphereWires(p,.37f,8,12,RAYWHITE);}
            for(const auto& p:pads){
                Color pc=p.active?GREEN:ThemePrimary(level.theme);
                if(memoryShowing&&p.id==MemoryWanted(level.number,memoryProgress,level.memoryLength))pc=WHITE;
                DrawCylinder(p.pos,.72f,.72f,.08f,4,pc);DrawCylinderWires(p.pos,.80f,.80f,.1f,4,RAYWHITE);
            }
            for(const auto& h:hazards){
                Vector3 p=h.pos;if(h.moving)p.x+=sinf((float)GetTime()*1.3f+h.phase)*4.5f;
                DrawCube(p,h.size.x,h.size.y,h.size.z,RED);DrawCubeWires(p,h.size.x,h.size.y,h.size.z,Color{255,120,120,255});
            }
            Vector3 exit=V3(0,.05f,-9.4f);
            DrawCylinder(exit,1.5f,1.5f,.08f,40,puzzleSolved?GREEN:Color{50,100,125,255});
            DrawCylinderWires(exit,1.65f,1.65f,.1f,40,RAYWHITE);
            EndMode3D();

            int collected=0;for(const auto& c:crystals)if(c.collected)collected++;
            Color accent=ThemePrimary(level.theme);
            DrawRectangle(0,0,GetScreenWidth(),74,Color{2,6,10,235});
            CrystalIcon({34,36},13,accent);DrawText(TextFormat("%d/%d",collected,level.crystals),52,23,24,RAYWHITE);
            ClockIcon({145,37},13,timeLeft<20?ORANGE:RAYWHITE);DrawText(TextFormat("%03.0f",timeLeft),165,23,24,timeLeft<20?ORANGE:RAYWHITE);
            DrawText(TextFormat("LEVEL %03d",level.number),GetScreenWidth()/2-65,22,24,accent);DrawText(PuzzleName(level.puzzle),GetScreenWidth()-170,26,16,GRAY);
            DrawRectangle(22,GetScreenHeight()-55,220,12,Color{17,25,33,255});DrawRectangle(22,GetScreenHeight()-55,(int)(220*stamina/100),12,SKYBLUE);DrawText("SPRINT",250,GetScreenHeight()-60,14,GRAY);
            for(int i=0;i<3;i++)StarIcon({(float)(GetScreenWidth()-94+i*24),(float)(GetScreenHeight()-42)},8,i<save.stars[level.number]?GOLD:Color{40,48,56,255});

            Vector2 cp={GetScreenWidth()/2.0f,GetScreenHeight()/2.0f};
            if(settings.crosshair==0){
                DrawLine((int)cp.x-10,(int)cp.y,(int)cp.x-3,(int)cp.y,RAYWHITE);
                DrawLine((int)cp.x+3,(int)cp.y,(int)cp.x+10,(int)cp.y,RAYWHITE);
                DrawLine((int)cp.x,(int)cp.y-10,(int)cp.x,(int)cp.y-3,RAYWHITE);
                DrawLine((int)cp.x,(int)cp.y+3,(int)cp.x,(int)cp.y+10,RAYWHITE);
            }else if(settings.crosshair==1){DrawCircleLines((int)cp.x,(int)cp.y,7,RAYWHITE);DrawCircle((int)cp.x,(int)cp.y,2,accent);}
            else DrawCircle((int)cp.x,(int)cp.y,3,RAYWHITE);

            if(settings.hints){
                DrawRectangle(20,88,GetScreenWidth()-40,36,Color{4,10,16,200});
                DrawText(TextFormat("%s • Collect every crystal • Reach the green exit",PuzzleName(level.puzzle)),34,98,15,Color{175,200,215,255});
            }
            DrawText("ESC PAUSE • E INTERACT • R RESTART",34,GetScreenHeight()-24,14,GRAY);
            if(respawnFlash>0)DrawRectangle(0,0,GetScreenWidth(),GetScreenHeight(),Color{255,60,60,40});
            if(screen==Screen::PAUSED){
                DrawRectangle(0,0,GetScreenWidth(),GetScreenHeight(),Color{0,0,0,175});
                CenterText("PAUSED",255,62,RAYWHITE);
                CenterText("ESC RESUME • R RESTART • S SETTINGS",355,22,SKYBLUE);
                if(timeLeft<=0)CenterText("TIME EXPIRED — PRESS R",425,20,ORANGE);
            }
        } else if(screen==Screen::COMPLETE){
            DrawRectangleGradientV(0,0,GetScreenWidth(),GetScreenHeight(),Color{14,34,40,255},Color{2,6,10,255});
            CenterText("VAULT MASTER",180,76,GREEN);CenterText("100 LEVELS COMPLETE",290,30,RAYWHITE);
            int total=0;for(int i=1;i<=LEVELS;i++)total+=save.stars[i];
            CenterText(TextFormat("TOTAL STARS  %d / %d",total,LEVELS*3),350,24,GOLD);
            CrystalIcon({GetScreenWidth()/2.0f,475},62,SKYBLUE);
            CenterText("ENTER / CLICK • LEVEL SELECT",610,22,SKYBLUE);
            CenterText("ESC MAIN MENU",650,18,GRAY);
        }

        EndDrawing();
    }

    SaveGame(save);EnableCursor();CloseWindow();return 0;
}

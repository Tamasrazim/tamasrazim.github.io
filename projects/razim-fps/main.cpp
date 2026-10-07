
#include "raylib.h"
#include "raymath.h"
#include <algorithm>
#include <array>
#include <cmath>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <filesystem>
#include <fstream>
#include <string>
#include <vector>

extern int QueryDedicatedVRAMMB();

namespace {
constexpr int LEVELS=100;
constexpr float PLAYER_RADIUS=0.35f;
constexpr float PLAYER_HEIGHT=1.8f;
constexpr float TAU=6.28318530718f;

enum class Screen{MENU,LEVELS,SETTINGS,CREDITS,PLAYING,PAUSED,COMPLETE};
enum class Objective{COLLECT,SWITCHES,KEYCARD,MEMORY,SURVIVE};

struct Settings{
    float sensitivity=0.0030f;
    bool invertY=false;
    float fov=75.0f;
    bool hints=true;
    bool shake=true;
    float sfx=0.65f;
    int crosshair=0;
    int displayMode=0;
    bool performance=false;
};
struct SaveData{
    int unlocked=1;
    std::array<int,LEVELS+1> stars{};
    Settings settings{};
};
struct Wall{Vector3 pos{};Vector3 size{};int material=0;};
struct Pickup{Vector3 pos{};bool taken=false;int kind=0;};
struct SwitchNode{Vector3 pos{};bool active=false;};
struct Door{Vector3 pos{};Vector3 size{1,2.5f,4};bool open=false;int link=-1;};
struct Hazard{Vector3 pos{};Vector3 size{0.7f,0.6f,2};float phase=0;};
struct Drone{Vector3 pos{};Vector3 base{};float phase=0;};

struct Level{
    int id=1;
    int tier=0;
    Objective objective=Objective::COLLECT;
    int required=3;
    float timeLimit=240;
    int theme=0;
    std::string title;
    std::vector<Wall> walls;
    std::vector<Pickup> pickups;
    std::vector<SwitchNode> switches;
    std::vector<Door> doors;
    std::vector<Hazard> hazards;
    std::vector<Drone> drones;
    Vector3 start{0,0.9f,24};
    Vector3 exit{0,0.1f,-25};
};

struct Assets{
    Texture2D floor{},wall{},metal{},hazard{},crystal{},terminal{},sky{};
    Model drone{},terminalModel{};
    Sound pickup{},hit{},click{},complete{};
    bool droneReady=false;
    bool soundsReady=false;
};

static Vector3 V(float x,float y,float z){return{x,y,z};}

static const char* ObjectiveName(Objective o){
    switch(o){
        case Objective::COLLECT:return"CRYSTAL RECOVERY";
        case Objective::SWITCHES:return"POWER RESTORE";
        case Objective::KEYCARD:return"KEYCARD BREACH";
        case Objective::MEMORY:return"MEMORY SEQUENCE";
        case Objective::SURVIVE:return"SURVIVAL RUN";
    }
    return"UNKNOWN";
}

static Color ThemeColor(int n){
    static const std::array<Color,10> c={
        Color{65,205,255,255},Color{112,125,255,255},Color{50,230,170,255},
        Color{255,185,70,255},Color{255,75,140,255},Color{190,100,255,255},
        Color{60,235,230,255},Color{255,105,65,255},Color{135,220,85,255},
        Color{225,225,255,255}};
    return c[n%10];
}

static std::string SavePath(){
#if defined(_WIN32)
    const char* base=std::getenv("LOCALAPPDATA");
    if(base&&*base){
        std::filesystem::path p=std::filesystem::path(base)/"Tamasrazim";
        std::error_code ec;
        std::filesystem::create_directories(p,ec);
        return(p/"NeonVault.cfg").string();
    }
#endif
    return"NeonVault.cfg";
}

static SaveData LoadGame(){
    SaveData s;
    std::ifstream in(SavePath());
    if(!in)return s;
    std::string k;
    while(in>>k){
        if(k=="unlocked")in>>s.unlocked;
        else if(k=="sensitivity")in>>s.settings.sensitivity;
        else if(k=="invertY"){int v;in>>v;s.settings.invertY=v!=0;}
        else if(k=="fov")in>>s.settings.fov;
        else if(k=="hints"){int v;in>>v;s.settings.hints=v!=0;}
        else if(k=="shake"){int v;in>>v;s.settings.shake=v!=0;}
        else if(k=="sfx")in>>s.settings.sfx;
        else if(k=="crosshair")in>>s.settings.crosshair;
        else if(k=="displayMode")in>>s.settings.displayMode;
        else if(k=="performance"){int v;in>>v;s.settings.performance=v!=0;}
        else if(k=="star"){
            int id=0,st=0;in>>id>>st;
            if(id>=1&&id<=LEVELS)s.stars[id]=std::clamp(st,0,3);
        }
    }
    s.unlocked=std::clamp(s.unlocked,1,LEVELS);
    s.settings.sensitivity=Clamp(s.settings.sensitivity,0.0008f,0.008f);
    s.settings.fov=Clamp(s.settings.fov,60.0f,105.0f);
    s.settings.sfx=Clamp(s.settings.sfx,0.0f,1.0f);
    s.settings.crosshair=std::clamp(s.settings.crosshair,0,2);
    s.settings.displayMode=std::clamp(s.settings.displayMode,0,2);
    return s;
}

static void SaveGame(const SaveData& s){
    std::ofstream out(SavePath(),std::ios::trunc);
    if(!out)return;
    out<<"unlocked "<<s.unlocked<<"\n";
    out<<"sensitivity "<<s.settings.sensitivity<<"\n";
    out<<"invertY "<<(s.settings.invertY?1:0)<<"\n";
    out<<"fov "<<s.settings.fov<<"\n";
    out<<"hints "<<(s.settings.hints?1:0)<<"\n";
    out<<"shake "<<(s.settings.shake?1:0)<<"\n";
    out<<"sfx "<<s.settings.sfx<<"\n";
    out<<"crosshair "<<s.settings.crosshair<<"\n";
    out<<"displayMode "<<s.settings.displayMode<<"\n";
    out<<"performance "<<(s.settings.performance?1:0)<<"\n";
    for(int i=1;i<=LEVELS;i++)out<<"star "<<i<<" "<<s.stars[i]<<"\n";
}

static bool HitsBox(Vector3 p,float r,Vector3 c,Vector3 size){
    Vector3 h=Vector3Scale(size,0.5f);
    float x=Clamp(p.x,c.x-h.x,c.x+h.x),z=Clamp(p.z,c.z-h.z,c.z+h.z);
    float dx=p.x-x,dz=p.z-z;
    return dx*dx+dz*dz<r*r;
}

static bool ClearPoint(const Level& l,Vector3 p,float radius){
    if(fabsf(p.x)>28-radius||fabsf(p.z)>28-radius)return false;
    for(const auto& w:l.walls)if(HitsBox(p,radius,w.pos,w.size))return false;
    for(const auto& d:l.doors)if(!d.open&&HitsBox(p,radius,d.pos,d.size))return false;
    return true;
}

static Vector3 SafePoint(const Level& l,Vector3 p,float radius,int salt){
    if(ClearPoint(l,p,radius))return p;
    for(int ring=1;ring<18;ring++){
        float r=ring*1.45f;
        for(int i=0;i<24;i++){
            float a=(float(i)/24.0f)*TAU+salt*0.371f;
            Vector3 q=V(p.x+cosf(a)*r,p.y,p.z+sinf(a)*r);
            if(ClearPoint(l,q,radius))return q;
        }
    }
    return V(0,p.y,12);
}

static Level BuildLevel(int id){
    Level l;
    l.id=std::clamp(id,1,LEVELS);
    l.tier=(l.id-1)/10;
    l.theme=(l.id-1)%10;
    l.objective=Objective((l.id-1)%5);
    l.title="SECTOR "+std::to_string(l.id);
    l.required=3+l.tier+(l.id%3);
    l.timeLimit=240+l.tier*25;
    if(l.objective==Objective::SURVIVE)l.timeLimit+=60;

    l.walls.push_back({V(0,1,-29),V(58,2,1),0});
    l.walls.push_back({V(0,1,29),V(58,2,1),0});
    l.walls.push_back({V(-29,1,0),V(1,2,58),0});
    l.walls.push_back({V(29,1,0),V(1,2,58),0});

    uint32_t seed=0x9E3779B9u^uint32_t(l.id*2654435761u);
    auto rnd=[&](){
        seed^=seed<<13;seed^=seed>>17;seed^=seed<<5;
        return float(seed&0x00FFFFFFu)/float(0x00FFFFFFu);
    };

    for(int lane=0;lane<4;lane++){
        float z=-20+lane*13;
        float gap=-10+float((l.id*11+lane*7)%18);
        float leftEnd=gap-4,rightStart=gap+4;
        float leftLen=leftEnd+29,rightLen=29-rightStart;
        if(leftLen>1)l.walls.push_back({V((-29+leftEnd)*0.5f,1,z),V(leftLen,2,0.8f),1});
        if(rightLen>1)l.walls.push_back({V((rightStart+29)*0.5f,1,z),V(rightLen,2,0.8f),1});
    }

    for(int i=0;i<8+l.tier*3;i++){
        float x=-22+rnd()*44,z=-21+rnd()*42;
        if(fabsf(z-24)<6)continue;
        Vector3 sz=V(1.3f+rnd()*2.2f,1.2f+rnd()*1.5f,1.3f+rnd()*2.2f);
        l.walls.push_back({V(x,sz.y*0.5f,z),sz,2});
    }

    if(l.objective==Objective::COLLECT){
        for(int i=0;i<l.required;i++){
            Vector3 p=V(-21+(i%4)*14,0.75f,-17+(i/4)*11);
            l.pickups.push_back({SafePoint(l,p,0.5f,10+i),false,0});
        }
    }else if(l.objective==Objective::SWITCHES){
        l.required=std::min(6,2+l.tier/2);
        for(int i=0;i<l.required;i++){
            Vector3 p=V(-18+(i%3)*18,0.75f,-12+(i/3)*17);
            l.switches.push_back({SafePoint(l,p,0.7f,40+i),false});
        }
        l.doors.push_back({V(0,1.25f,-14),V(1.2f,2.5f,5),false,1});
    }else if(l.objective==Objective::KEYCARD){
        l.required=1+l.tier/3;
        for(int i=0;i<l.required;i++){
            Vector3 p=V(-14+i*10,0.75f,10-i*7);
            l.pickups.push_back({SafePoint(l,p,0.5f,70+i),false,1});
        }
        l.doors.push_back({V(0,1.25f,-8),V(1.2f,2.5f,7),false,0});
    }else if(l.objective==Objective::MEMORY){
        l.required=std::min(10,4+l.tier);
        for(int i=0;i<l.required;i++){
            Vector3 p=V(-15+(i%5)*7.5f,0.2f,-3+(i/5)*8);
            l.pickups.push_back({SafePoint(l,p,0.5f,100+i),false,2});
        }
    }

    for(int i=0;i<std::max(1,l.tier+(l.id%4));i++){
        Vector3 p=SafePoint(l,V(-18+rnd()*36,0.45f,-18+rnd()*34),0.6f,140+i);
        l.hazards.push_back({p,V(0.7f+rnd()*0.8f,0.7f,2.2f),rnd()*TAU});
    }

    int drones=l.tier>=2?std::min(5,1+l.tier/2):0;
    for(int i=0;i<drones;i++){
        Vector3 p=SafePoint(l,V(-20+rnd()*40,1.1f,-17+rnd()*34),0.9f,180+i);
        l.drones.push_back({p,p,rnd()*TAU});
    }

    l.start=V(0,PLAYER_HEIGHT*0.5f,24);
    l.exit=V(0,0.1f,-25);

    if(l.id==100){
        l.title="THE VAULT CORE";
        l.objective=Objective::SURVIVE;
        l.required=30;
        l.timeLimit=420;
        for(int i=0;i<8;i++)l.hazards.push_back({V(-18+i*5,0.45f,-4+(i%2)*8),V(0.9f,0.8f,3),float(i)});
        for(int i=0;i<4;i++)l.switches.push_back({SafePoint(l,V(-18+i*12,0.8f,10),0.7f,220+i),false});
        for(int i=0;i<5;i++)l.pickups.push_back({SafePoint(l,V(-18+i*9,0.75f,-18),0.5f,240+i),false,0});
    }
    return l;
}

static bool ButtonHit(Rectangle r){
    return CheckCollisionPointRec(GetMousePosition(),r)&&IsMouseButtonPressed(MOUSE_BUTTON_LEFT);
}

static void ButtonDraw(Rectangle r,const char* label,Color accent){
    bool hover=CheckCollisionPointRec(GetMousePosition(),r);
    DrawRectangleRounded(r,0.08f,10,hover?Color{23,44,58,255}:Color{10,21,31,255});
    DrawRectangleRoundedLines(r,0.08f,10,hover?accent:Color{44,61,75,255});
    int fs=20,w=MeasureText(label,fs);
    DrawText(label,int(r.x+(r.width-w)*0.5f),int(r.y+(r.height-fs)*0.5f),fs,RAYWHITE);
}

static void Center(const char* t,int y,int size,Color c){
    DrawText(t,(GetScreenWidth()-MeasureText(t,size))/2,y,size,c);
}

static void Panel(Rectangle r,Color fill,Color border){
    DrawRectangleRounded(r,0.08f,10,fill);
    DrawRectangleRoundedLines(r,0.08f,10,border);
}

static void Crosshair(int style,Color c){
    int x=GetScreenWidth()/2,y=GetScreenHeight()/2;
    if(style==0){
        DrawLine(x-10,y,x-3,y,c);DrawLine(x+3,y,x+10,y,c);
        DrawLine(x,y-10,x,y-3,c);DrawLine(x,y+3,x,y+10,c);
    }else if(style==1){
        DrawCircleLines(x,y,7,c);DrawCircle(x,y,2,c);
    }else DrawCircle(x,y,3,c);
}

static Texture2D Tex(const char* file,Color fallback){
    if(FileExists(file)){
        Texture2D t=LoadTexture(file);
        if(t.id){SetTextureFilter(t,TEXTURE_FILTER_BILINEAR);return t;}
    }
    Image im=GenImageColor(64,64,fallback);
    Texture2D t=LoadTextureFromImage(im);
    UnloadImage(im);
    return t;
}

static Assets LoadAssets(){
    Assets a;
    a.floor=Tex("assets/textures/floor.bmp",Color{30,39,50,255});
    a.wall=Tex("assets/textures/wall.bmp",Color{45,58,72,255});
    a.metal=Tex("assets/textures/metal.bmp",Color{72,82,95,255});
    a.hazard=Tex("assets/textures/hazard.bmp",Color{165,42,48,255});
    a.crystal=Tex("assets/textures/crystal.bmp",Color{55,180,235,255});
    a.terminal=Tex("assets/textures/terminal.bmp",Color{50,180,155,255});
    a.sky=Tex("assets/textures/sky.bmp",Color{6,13,26,255});
    if(FileExists("assets/models/drone.obj")){
        a.drone=LoadModel("assets/models/drone.obj");
        a.droneReady=a.drone.meshCount>0;
    }
    if(FileExists("assets/models/terminal.obj"))a.terminalModel=LoadModel("assets/models/terminal.obj");
    if(IsAudioDeviceReady()){
        a.pickup=LoadSound("assets/audio/pickup.wav");
        a.hit=LoadSound("assets/audio/hit.wav");
        a.click=LoadSound("assets/audio/click.wav");
        a.complete=LoadSound("assets/audio/complete.wav");
        a.soundsReady=IsSoundValid(a.pickup)&&IsSoundValid(a.hit)&&IsSoundValid(a.click)&&IsSoundValid(a.complete);
    }
    return a;
}

static void UnloadAssets(Assets& a){
    if(a.floor.id)UnloadTexture(a.floor);
    if(a.wall.id)UnloadTexture(a.wall);
    if(a.metal.id)UnloadTexture(a.metal);
    if(a.hazard.id)UnloadTexture(a.hazard);
    if(a.crystal.id)UnloadTexture(a.crystal);
    if(a.terminal.id)UnloadTexture(a.terminal);
    if(a.sky.id)UnloadTexture(a.sky);
    if(a.droneReady)UnloadModel(a.drone);
    if(a.terminalModel.meshCount)UnloadModel(a.terminalModel);
    if(a.soundsReady){
        UnloadSound(a.pickup);UnloadSound(a.hit);UnloadSound(a.click);UnloadSound(a.complete);
    }
}

static void SetDisplayMode(Settings& s,int mode){
    s.displayMode=std::clamp(mode,0,2);
    if(s.displayMode==2){
        if(!IsWindowFullscreen())ToggleFullscreen();
        ClearWindowState(FLAG_WINDOW_UNDECORATED);
    }else if(s.displayMode==1){
        if(IsWindowFullscreen())ToggleFullscreen();
        SetWindowState(FLAG_WINDOW_UNDECORATED);
        int m=GetCurrentMonitor();
        SetWindowSize(GetMonitorWidth(m),GetMonitorHeight(m));
        SetWindowPosition(0,0);
    }else{
        if(IsWindowFullscreen())ToggleFullscreen();
        ClearWindowState(FLAG_WINDOW_UNDECORATED);
        SetWindowSize(1440,900);
    }
}

static bool ValidateAllLevels(){
    bool ok=true;
    for(int id=1;id<=LEVELS;id++){
        Level l=BuildLevel(id);
        if(!ClearPoint(l,l.start,PLAYER_RADIUS)){std::printf("floor %d invalid start\n",id);ok=false;}
        for(const auto& p:l.pickups)if(!ClearPoint(l,p.pos,0.45f))ok=false;
        for(const auto& s:l.switches)if(!ClearPoint(l,s.pos,0.65f))ok=false;
        for(const auto& h:l.hazards)if(!ClearPoint(l,h.pos,0.5f))ok=false;
        for(const auto& d:l.drones)if(!ClearPoint(l,d.pos,0.8f))ok=false;
    }
    std::printf("NEON VAULT VALIDATION COMPLETE: %s\n",ok?"PASS":"FAIL");
    return ok;
}
}

int main(int argc,char** argv){
    if(argc>1&&std::strcmp(argv[1],"--validate")==0)return ValidateAllLevels()?0:1;

    SetConfigFlags(FLAG_MSAA_4X_HINT|FLAG_WINDOW_RESIZABLE|FLAG_VSYNC_HINT);
    InitWindow(1440,900,"NEON VAULT");
    SetExitKey(KEY_NULL);
    SetTargetFPS(144);
    InitAudioDevice();

    SaveData save=LoadGame();
    if(save.settings.displayMode!=0)SetDisplayMode(save.settings,save.settings.displayMode);
    Assets assets=LoadAssets();

    Screen screen=Screen::MENU;
    Screen returnScreen=Screen::MENU;
    Level level=BuildLevel(save.unlocked);
    Vector3 player=level.start;
    Vector3 velocity{};
    float yaw=3.14159265359f,pitch=0,stamina=100,health=100,timeLeft=0;
    float levelStartTime=0,damageCooldown=0,hintTimer=0;
    int collected=0,switchesActive=0,memoryStep=0;
    bool grounded=true,mouseCaptured=false,quit=false;
    int settingsRow=0;

    auto CaptureMouse=[&](bool capture){
        if(capture){
            if(!mouseCaptured){
                SetMousePosition(GetScreenWidth()/2,GetScreenHeight()/2);
                DisableCursor();
                mouseCaptured=true;
            }
        }else{
            mouseCaptured=false;
            EnableCursor();
        }
    };

    auto ClickSound=[&](){
        if(assets.soundsReady){SetSoundVolume(assets.click,save.settings.sfx);PlaySound(assets.click);}
    };

    auto StartLevel=[&](int id){
        level=BuildLevel(id);
        player=level.start;
        velocity={};
        yaw=3.14159265359f;
        pitch=0;
        stamina=100;
        health=100;
        timeLeft=level.timeLimit;
        levelStartTime=level.timeLimit;
        collected=0;
        switchesActive=0;
        memoryStep=0;
        damageCooldown=0;
        hintTimer=4;
        grounded=true;
        screen=Screen::PLAYING;
        CaptureMouse(false);
    };

    auto ObjectiveComplete=[&](){
        if(level.objective==Objective::COLLECT)return collected>=level.required;
        if(level.objective==Objective::SWITCHES)return switchesActive>=level.required;
        if(level.objective==Objective::KEYCARD){
            int keys=0;for(const auto& p:level.pickups)if(p.kind==1&&p.taken)keys++;
            return keys>=level.required;
        }
        if(level.objective==Objective::MEMORY)return memoryStep>=level.required;
        return false;
    };

    auto ExitOpen=[&](){return level.objective==Objective::SURVIVE||ObjectiveComplete();};

    auto Respawn=[&](){
        player=level.start;
        velocity={};
        health=std::max(1.0f,health-25);
        timeLeft=std::max(0.0f,timeLeft-5);
        damageCooldown=1.0f;
        if(assets.soundsReady){SetSoundVolume(assets.hit,save.settings.sfx);PlaySound(assets.hit);}
    };

    while(!WindowShouldClose()&&!quit){
        float dt=std::min(GetFrameTime(),0.05f);

        if(IsKeyPressed(KEY_F11)){
            SetDisplayMode(save.settings,IsWindowFullscreen()?1:2);
            SaveGame(save);
        }

        if(screen!=Screen::PLAYING)CaptureMouse(false);

        if(screen==Screen::MENU){
            Rectangle a={GetScreenWidth()/2.0f-180,270,360,58};
            Rectangle b={GetScreenWidth()/2.0f-180,340,360,58};
            Rectangle c={GetScreenWidth()/2.0f-180,410,360,58};
            Rectangle d={GetScreenWidth()/2.0f-180,480,360,58};
            Rectangle e={GetScreenWidth()/2.0f-180,550,360,58};
            if(IsKeyPressed(KEY_ENTER)||ButtonHit(a)){StartLevel(save.unlocked);ClickSound();}
            else if(ButtonHit(b)){screen=Screen::LEVELS;ClickSound();}
            else if(ButtonHit(c)){returnScreen=Screen::MENU;screen=Screen::SETTINGS;ClickSound();}
            else if(ButtonHit(d)){screen=Screen::CREDITS;ClickSound();}
            else if(ButtonHit(e)){quit=true;ClickSound();}
        }else if(screen==Screen::LEVELS){
            if(IsKeyPressed(KEY_ESCAPE))screen=Screen::MENU;
            int cols=10,cellW=82,cellH=52,startX=(GetScreenWidth()-cols*cellW)/2,startY=175;
            if(IsMouseButtonPressed(MOUSE_BUTTON_LEFT)){
                Vector2 m=GetMousePosition();
                for(int i=1;i<=LEVELS;i++){
                    int col=(i-1)%cols,row=(i-1)/cols;
                    Rectangle r={float(startX+col*cellW+4),float(startY+row*cellH+4),74,44};
                    if(i<=save.unlocked&&CheckCollisionPointRec(m,r)){StartLevel(i);ClickSound();break;}
                }
            }
        }else if(screen==Screen::SETTINGS){
            if(IsKeyPressed(KEY_ESCAPE)){SaveGame(save);screen=returnScreen;}
            if(IsKeyPressed(KEY_UP))settingsRow=(settingsRow+7)%8;
            if(IsKeyPressed(KEY_DOWN))settingsRow=(settingsRow+1)%8;
            if(IsMouseButtonPressed(MOUSE_BUTTON_LEFT)){
                int left=GetScreenWidth()/2-300;
                for(int i=0;i<8;i++){
                    Rectangle rr={float(left),170.0f+i*58.0f,600,46};
                    if(CheckCollisionPointRec(GetMousePosition(),rr))settingsRow=i;
                }
            }
            int dir=(IsKeyPressed(KEY_RIGHT)?1:0)-(IsKeyPressed(KEY_LEFT)?1:0);
            if(IsKeyPressed(KEY_ENTER))dir=1;
            if(dir!=0){
                switch(settingsRow){
                    case 0:save.settings.sensitivity=Clamp(save.settings.sensitivity+dir*0.0002f,0.0008f,0.008f);break;
                    case 1:save.settings.invertY=!save.settings.invertY;break;
                    case 2:save.settings.fov=Clamp(save.settings.fov+dir*2,60,105);break;
                    case 3:save.settings.hints=!save.settings.hints;break;
                    case 4:save.settings.shake=!save.settings.shake;break;
                    case 5:save.settings.crosshair=(save.settings.crosshair+(dir>0?1:2))%3;break;
                    case 6:SetDisplayMode(save.settings,(save.settings.displayMode+(dir>0?1:2))%3);break;
                    case 7:save.settings.performance=!save.settings.performance;break;
                }
                SaveGame(save);ClickSound();
            }
        }else if(screen==Screen::CREDITS){
            if(IsKeyPressed(KEY_ESCAPE)||IsMouseButtonPressed(MOUSE_BUTTON_LEFT))screen=Screen::MENU;
        }else if(screen==Screen::PLAYING){
            if(IsKeyPressed(KEY_ESCAPE)){CaptureMouse(false);screen=Screen::PAUSED;}
            if(!mouseCaptured&&IsMouseButtonPressed(MOUSE_BUTTON_LEFT))CaptureMouse(true);

            if(mouseCaptured){
                Vector2 md=GetMouseDelta();
                yaw-=md.x*save.settings.sensitivity;
                pitch+=(save.settings.invertY?md.y:-md.y)*save.settings.sensitivity;
                pitch=Clamp(pitch,-1.48f,1.48f);
            }

            Vector3 wish{};
            if(IsKeyDown(KEY_W))wish.z+=1;
            if(IsKeyDown(KEY_S))wish.z-=1;
            if(IsKeyDown(KEY_A))wish.x-=1;
            if(IsKeyDown(KEY_D))wish.x+=1;
            if(Vector3Length(wish)>0.01f)wish=Vector3Normalize(wish);

            Vector3 fwd=V(sinf(yaw),0,cosf(yaw));
            Vector3 right=V(fwd.z,0,-fwd.x);
            Vector3 move=Vector3Add(Vector3Scale(right,wish.x),Vector3Scale(fwd,wish.z));
            if(Vector3Length(move)>0.01f)move=Vector3Normalize(move);

            bool sprint=IsKeyDown(KEY_LEFT_SHIFT)&&stamina>1&&Vector3Length(move)>0.01f;
            float speed=sprint?8.4f:5.0f;
            stamina=sprint?std::max(0.0f,stamina-22*dt):std::min(100.0f,stamina+15*dt);

            Vector3 next=player;
            next.x+=move.x*speed*dt;
            bool block=false;
            for(const auto& w:level.walls)if(HitsBox(next,PLAYER_RADIUS,w.pos,w.size)){block=true;break;}
            for(const auto& d:level.doors)if(!d.open&&HitsBox(next,PLAYER_RADIUS,d.pos,d.size)){block=true;break;}
            if(!block)player.x=next.x;
            next=player;
            next.z+=move.z*speed*dt;
            block=false;
            for(const auto& w:level.walls)if(HitsBox(next,PLAYER_RADIUS,w.pos,w.size)){block=true;break;}
            for(const auto& d:level.doors)if(!d.open&&HitsBox(next,PLAYER_RADIUS,d.pos,d.size)){block=true;break;}
            if(!block)player.z=next.z;

            if(IsKeyPressed(KEY_SPACE)&&grounded){velocity.y=6.8f;grounded=false;}
            velocity.y-=18*dt;
            player.y+=velocity.y*dt;
            if(player.y<=PLAYER_HEIGHT*0.5f){player.y=PLAYER_HEIGHT*0.5f;velocity.y=0;grounded=true;}

            timeLeft-=dt;
            damageCooldown-=dt;
            hintTimer=std::max(0.0f,hintTimer-dt);

            for(auto& h:level.hazards){
                Vector3 hp=V(h.pos.x+sinf(float(GetTime())*1.8f+h.phase)*2.5f,h.pos.y,h.pos.z);
                if(damageCooldown<=0&&HitsBox(player,PLAYER_RADIUS,hp,h.size)){Respawn();break;}
            }

            for(auto& dr:level.drones){
                dr.pos.x=dr.base.x+sinf(float(GetTime())*0.9f+dr.phase)*2.2f;
                dr.pos.z=dr.base.z+cosf(float(GetTime())*0.7f+dr.phase)*2.0f;
                if(damageCooldown<=0&&Vector3Distance(player,dr.pos)<1.35f)Respawn();
            }

            if(IsKeyPressed(KEY_E)){
                for(auto& s:level.switches)if(!s.active&&Vector3Distance(player,s.pos)<2.0f){s.active=true;switchesActive++;ClickSound();}
                for(auto& p:level.pickups)if(!p.taken&&Vector3Distance(player,p.pos)<1.5f){
                    p.taken=true;
                    if(p.kind==0)collected++;
                    else if(p.kind==2)memoryStep++;
                    if(assets.soundsReady){SetSoundVolume(assets.pickup,save.settings.sfx);PlaySound(assets.pickup);}
                }
            }

            bool done=ObjectiveComplete();
            for(auto& d:level.doors){
                if(d.link==0&&level.objective==Objective::KEYCARD){
                    int keys=0;for(const auto& p:level.pickups)if(p.kind==1&&p.taken)keys++;
                    d.open=keys>=level.required;
                }else if(d.link==1)d.open=done;
            }

            if(ExitOpen()&&Vector3Distance(player,level.exit)<2.5f){
                float ratio=levelStartTime>0?std::max(0.0f,timeLeft)/levelStartTime:0;
                int stars=ratio>0.60f&&health>50?3:(ratio>0.20f?2:1);
                save.stars[level.id]=std::max(save.stars[level.id],stars);
                if(level.id<LEVELS)save.unlocked=std::max(save.unlocked,level.id+1);
                SaveGame(save);
                if(level.id==LEVELS){
                    screen=Screen::COMPLETE;
                    if(assets.soundsReady){SetSoundVolume(assets.complete,save.settings.sfx);PlaySound(assets.complete);}
                }else screen=Screen::LEVELS;
                CaptureMouse(false);
            }

            if(level.objective!=Objective::SURVIVE&&timeLeft<=0){CaptureMouse(false);screen=Screen::PAUSED;}
            if(level.objective==Objective::SURVIVE&&timeLeft<=0){
                if(level.id<LEVELS)save.unlocked=std::max(save.unlocked,level.id+1);
                save.stars[level.id]=3;
                SaveGame(save);
                screen=level.id==LEVELS?Screen::COMPLETE:Screen::LEVELS;
                CaptureMouse(false);
            }
        }else if(screen==Screen::PAUSED){
            if(IsKeyPressed(KEY_ESCAPE)){screen=Screen::PLAYING;CaptureMouse(true);}
            Rectangle a={GetScreenWidth()/2.0f-180,330,360,58};
            Rectangle b={GetScreenWidth()/2.0f-180,400,360,58};
            Rectangle c={GetScreenWidth()/2.0f-180,470,360,58};
            Rectangle d={GetScreenWidth()/2.0f-180,540,360,58};
            if(ButtonHit(a)){screen=Screen::PLAYING;CaptureMouse(true);ClickSound();}
            else if(ButtonHit(b)){StartLevel(level.id);ClickSound();}
            else if(ButtonHit(c)){returnScreen=Screen::PAUSED;screen=Screen::SETTINGS;ClickSound();}
            else if(ButtonHit(d)){screen=Screen::MENU;ClickSound();}
        }else if(screen==Screen::COMPLETE){
            if(IsKeyPressed(KEY_ENTER)||ButtonHit({GetScreenWidth()/2.0f-180,500,360,58}))screen=Screen::LEVELS;
        }

        BeginDrawing();
        ClearBackground(Color{5,9,16,255});

        if(screen==Screen::MENU){
            DrawTexturePro(assets.sky,{0,0,(float)assets.sky.width,(float)assets.sky.height},{0,0,(float)GetScreenWidth(),(float)GetScreenHeight()},{0,0},0,Color{120,145,180,255});
            DrawRectangle(0,0,GetScreenWidth(),GetScreenHeight(),Color{1,6,12,180});
            Center("NEON VAULT",90,64,RAYWHITE);
            Center("100-FLOOR FIRST-PERSON PUZZLE EXPEDITION",166,18,LIGHTGRAY);
            Center(TextFormat("PROGRESS  %03d / %03d",save.unlocked,LEVELS),195,16,SKYBLUE);
            Panel({GetScreenWidth()/2.0f-240,250,480,390},Color{5,14,24,235},Color{38,68,92,255});
            ButtonDraw({GetScreenWidth()/2.0f-180,270,360,58},"ENTER VAULT",SKYBLUE);
            ButtonDraw({GetScreenWidth()/2.0f-180,340,360,58},"FLOOR SELECT",ThemeColor(1));
            ButtonDraw({GetScreenWidth()/2.0f-180,410,360,58},"SETTINGS",ThemeColor(2));
            ButtonDraw({GetScreenWidth()/2.0f-180,480,360,58},"CREDITS",ThemeColor(4));
            ButtonDraw({GetScreenWidth()/2.0f-180,550,360,58},"QUIT",Color{255,100,100,255});
            DrawText("v2.0 • REAL SHIPPED CONTENT BUILD",24,GetScreenHeight()-28,13,GRAY);
        }else if(screen==Screen::LEVELS){
            Center("FLOOR SELECT",65,42,RAYWHITE);
            Center(TextFormat("%03d / %03d UNLOCKED",save.unlocked,LEVELS),118,16,SKYBLUE);
            int cols=10,cellW=82,cellH=52,startX=(GetScreenWidth()-cols*cellW)/2,startY=175;
            for(int i=1;i<=LEVELS;i++){
                int col=(i-1)%cols,row=(i-1)/cols;
                Rectangle r={float(startX+col*cellW+4),float(startY+row*cellH+4),74,44};
                bool unlocked=i<=save.unlocked,hover=CheckCollisionPointRec(GetMousePosition(),r);
                Panel(r,unlocked?(hover?Color{20,44,59,255}:Color{10,22,33,255}):Color{8,12,17,255},unlocked?ThemeColor((i-1)%10):Color{32,38,45,255});
                DrawText(TextFormat("%02d",i),int(r.x+24),int(r.y+7),18,unlocked?RAYWHITE:DARKGRAY);
                if(save.stars[i])DrawText(TextFormat("★%d",save.stars[i]),int(r.x+20),int(r.y+27),10,GOLD);
            }
            DrawText("ESC • BACK",32,GetScreenHeight()-35,14,GRAY);
        }else if(screen==Screen::SETTINGS){
            Center("SETTINGS",70,42,RAYWHITE);
            Center("ARROWS / ENTER TO CHANGE • ESC TO SAVE AND BACK",115,14,GRAY);
            int left=GetScreenWidth()/2-300;
            const char* labels[8]={"MOUSE SENSITIVITY","INVERT Y","FIELD OF VIEW","HINTS","SCREEN SHAKE","CROSSHAIR","DISPLAY","PERFORMANCE"};
            std::string values[8]={
                TextFormat("%.4f",save.settings.sensitivity),
                save.settings.invertY?"ON":"OFF",
                TextFormat("%.0f",save.settings.fov),
                save.settings.hints?"ON":"OFF",
                save.settings.shake?"ON":"OFF",
                TextFormat("STYLE %d",save.settings.crosshair+1),
                save.settings.displayMode==0?"WINDOWED":(save.settings.displayMode==1?"BORDERLESS":"FULLSCREEN"),
                save.settings.performance?"ON":"OFF"
            };
            for(int i=0;i<8;i++){
                Rectangle rr={float(left),170.0f+i*58.0f,600,46};
                bool hot=i==settingsRow||CheckCollisionPointRec(GetMousePosition(),rr);
                Panel(rr,hot?Color{20,42,58,255}:Color{11,22,32,255},hot?SKYBLUE:Color{48,64,78,255});
                DrawText(labels[i],int(rr.x+18),int(rr.y+13),16,RAYWHITE);
                DrawText(values[i].c_str(),int(rr.x+390),int(rr.y+13),16,SKYBLUE);
            }
        }else if(screen==Screen::CREDITS){
            Center("CREDITS",90,42,RAYWHITE);
            Center("GAME DESIGN / PROGRAMMING",190,18,SKYBLUE);
            Center("Tamasrazim",225,30,RAYWHITE);
            Center("Native Windows x64 • Raylib • deterministic 100-floor system",285,16,LIGHTGRAY);
            Center("Textures • models • sound effects • procedural environments",320,16,LIGHTGRAY);
            Center("CLICK OR ESC TO RETURN",520,14,GRAY);
        }else if(screen==Screen::PLAYING||screen==Screen::PAUSED){
            Camera3D cam{};
            cam.position=Vector3Add(player,V(0,0.62f,0));
            cam.target=Vector3Add(cam.position,V(sinf(yaw)*cosf(pitch),sinf(pitch),cosf(yaw)*cosf(pitch)));
            cam.up=V(0,1,0);
            cam.fovy=save.settings.fov;
            cam.projection=CAMERA_PERSPECTIVE;

            BeginMode3D(cam);
            DrawCubeTexture(assets.floor,V(0,-0.05f,0),58,0.1f,58,WHITE);
            DrawBillboard(cam,assets.sky,V(0,14,-36),34,Color{180,205,235,255});
            for(const auto& w:level.walls){
                const Texture2D& t=w.material==2?assets.metal:assets.wall;
                DrawCubeTexture(t,w.pos,w.size.x,w.size.y,w.size.z,WHITE);
                DrawCubeWires(w.pos,w.size.x,w.size.y,w.size.z,Color{72,105,128,255});
            }
            for(const auto& d:level.doors)if(!d.open){
                DrawCubeTexture(assets.metal,d.pos,d.size.x,d.size.y,d.size.z,WHITE);
                DrawCubeWires(d.pos,d.size.x,d.size.y,d.size.z,ORANGE);
            }
            for(const auto& h:level.hazards){
                Vector3 p=V(h.pos.x+sinf(float(GetTime())*1.8f+h.phase)*2.5f,h.pos.y,h.pos.z);
                DrawCubeTexture(assets.hazard,p,h.size.x,h.size.y,h.size.z,WHITE);
                DrawCubeWires(p,h.size.x,h.size.y,h.size.z,RED);
            }
            for(const auto& p:level.pickups)if(!p.taken){
                float bob=0.20f*sinf(float(GetTime())*3+p.pos.x);
                Vector3 q=V(p.pos.x,p.pos.y+bob,p.pos.z);
                DrawSphere(q,p.kind==1?0.34f:0.28f,p.kind==1?GOLD:(p.kind==2?MAGENTA:ThemeColor(level.theme)));
                DrawSphereWires(q,0.37f,8,8,RAYWHITE);
            }
            for(const auto& s:level.switches){
                Color c=s.active?GREEN:ThemeColor(level.theme);
                if(assets.terminalModel.meshCount)DrawModelEx(assets.terminalModel,s.pos,V(0,1,0),0,V(0.9f,0.9f,0.9f),WHITE);
                else DrawCubeTexture(assets.terminal,s.pos,0.7f,1.0f,0.3f,WHITE);
                DrawCubeWires(s.pos,0.72f,1.02f,0.32f,c);
            }
            for(const auto& dr:level.drones){
                if(assets.droneReady)DrawModelEx(assets.drone,dr.pos,V(0,1,0),float(GetTime())*35,V(0.9f,0.9f,0.9f),WHITE);
                else DrawSphere(dr.pos,0.55f,Color{220,65,95,255});
                DrawSphereWires(dr.pos,0.7f,8,8,Color{255,80,110,180});
            }
            bool exitOpen=level.objective==Objective::SURVIVE||ObjectiveComplete();
            DrawCylinder(level.exit,1.5f,1.5f,0.15f,32,exitOpen?GREEN:Color{55,90,110,255});
            DrawCylinderWires(level.exit,1.7f,1.7f,0.18f,32,RAYWHITE);
            EndMode3D();

            Panel({24,24,380,102},Color{5,13,22,225},Color{40,75,98,255});
            DrawText(TextFormat("FLOOR %03d  •  %s",level.id,level.title.c_str()),42,43,18,RAYWHITE);
            DrawText(ObjectiveName(level.objective),42,69,13,ThemeColor(level.theme));
            const char* objective="";
            if(level.objective==Objective::COLLECT)objective=TextFormat("CRYSTALS %d / %d",collected,level.required);
            else if(level.objective==Objective::SWITCHES)objective=TextFormat("SWITCHES %d / %d",switchesActive,level.required);
            else if(level.objective==Objective::KEYCARD){
                int keys=0;for(const auto& p:level.pickups)if(p.kind==1&&p.taken)keys++;
                objective=TextFormat("KEYCARDS %d / %d",keys,level.required);
            }else if(level.objective==Objective::MEMORY)objective=TextFormat("MEMORY %d / %d",memoryStep,level.required);
            else objective=TextFormat("SURVIVE %.0fs",std::max(0.0f,timeLeft));
            DrawText(objective,42,91,14,RAYWHITE);

            DrawText(TextFormat("HP %03d",int(health)),24,GetScreenHeight()-82,16,health>50?GREEN:ORANGE);
            DrawRectangle(24,GetScreenHeight()-58,180,9,Color{18,24,32,255});
            DrawRectangle(24,GetScreenHeight()-58,int(180*health/100.0f),9,RED);
            DrawText(TextFormat("STAMINA %03d",int(stamina)),224,GetScreenHeight()-62,14,SKYBLUE);
            if(save.settings.hints&&!mouseCaptured&&screen==Screen::PLAYING)Center("CLICK TO CAPTURE MOUSE  •  ESC PAUSE",GetScreenHeight()/2+70,15,RAYWHITE);
            if(save.settings.hints&&hintTimer>0)DrawText("WASD MOVE • SHIFT SPRINT • SPACE JUMP • E INTERACT",24,GetScreenHeight()-25,13,GRAY);
            if(mouseCaptured&&screen==Screen::PLAYING)Crosshair(save.settings.crosshair,RAYWHITE);

            if(save.settings.performance){
                Panel({GetScreenWidth()-220,24,196,92},Color{5,13,22,225},Color{42,63,82,255});
                DrawText(TextFormat("FPS %d",GetFPS()),GetScreenWidth()-204,40,13,RAYWHITE);
                DrawText(TextFormat("FRAME %.2f ms",GetFrameTime()*1000),GetScreenWidth()-204,60,13,RAYWHITE);
                int v=QueryDedicatedVRAMMB();
                DrawText(v?TextFormat("VRAM %d MB",v):"VRAM N/A",GetScreenWidth()-204,80,13,RAYWHITE);
            }
            if(screen==Screen::PAUSED){
                DrawRectangle(0,0,GetScreenWidth(),GetScreenHeight(),Color{0,5,10,165});
                Center("PAUSED",185,48,RAYWHITE);
                Center("THE WINDOWS CURSOR IS RELEASED",240,16,LIGHTGRAY);
                ButtonDraw({GetScreenWidth()/2.0f-180,330,360,58},"RESUME • CAPTURE MOUSE",SKYBLUE);
                ButtonDraw({GetScreenWidth()/2.0f-180,400,360,58},"RESTART FLOOR",ORANGE);
                ButtonDraw({GetScreenWidth()/2.0f-180,470,360,58},"SETTINGS",ThemeColor(2));
                ButtonDraw({GetScreenWidth()/2.0f-180,540,360,58},"MAIN MENU",Color{230,90,120,255});
            }
        }else if(screen==Screen::COMPLETE){
            ClearBackground(Color{5,14,18,255});
            Center("VAULT MASTER",160,58,GREEN);
            Center("ALL 100 FLOORS COMPLETE",235,24,RAYWHITE);
            int total=0;for(int i=1;i<=LEVELS;i++)total+=save.stars[i];
            Center(TextFormat("TOTAL STARS  %d / %d",total,LEVELS*3),275,18,GOLD);
            ButtonDraw({GetScreenWidth()/2.0f-180,500,360,58},"RETURN TO FLOOR SELECT",GREEN);
        }

        EndDrawing();
    }

    SaveGame(save);
    UnloadAssets(assets);
    CloseAudioDevice();
    EnableCursor();
    CloseWindow();
    return 0;
}

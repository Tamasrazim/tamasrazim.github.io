
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
#include <queue>
#include <string>
#include <vector>

extern int QueryDedicatedVRAMMB();
#if defined(_WIN32)
extern void EnsureWorkingDirectory();
#endif

namespace {
constexpr int LEVELS=100;
constexpr int SAVE_VERSION=2;
constexpr float PLAYER_RADIUS=0.35f;
constexpr float PLAYER_HEIGHT=1.8f;
constexpr float TAU=6.28318530718f;

enum class Screen{INTRO,MENU,LEVELS,SETTINGS,CREDITS,PLAYING,PAUSED,COMPLETE,GAMEOVER};
enum class Objective{COLLECT,SWITCHES,KEYCARD,MEMORY,SURVIVE,COMBO};

struct Settings{
    float sensitivity=0.0030f;
    bool invertY=false;
    float fov=75.0f;
    bool hints=true;
    bool shake=true;
    float sfx=0.65f;
    float music=0.55f;
    int crosshair=0;
    int displayMode=0;
    bool performance=false;
};
struct SaveData{
    int version=SAVE_VERSION;
    int unlocked=1;
    std::array<int,LEVELS+1> stars{};
    Settings settings{};
    bool migrated=false;
};
struct Wall{Vector3 pos{};Vector3 size{};int material=0;};
struct Pickup{Vector3 pos{};bool taken=false;int kind=0;int order=0;};
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
    Sound theme{};
    Model floorModel{},wallModel{},metalModel{},hazardModel{};
    Model drone{},terminalModel{};
    Sound pickup{},hit{},click{},complete{};
    bool droneReady=false;
    bool soundsReady=false;
    bool musicReady=false;
};

static Vector3 V(float x,float y,float z){return{x,y,z};}

static const char* ObjectiveName(Objective o){
    switch(o){
        case Objective::COLLECT:return"CRYSTAL RECOVERY";
        case Objective::SWITCHES:return"POWER RESTORE";
        case Objective::KEYCARD:return"KEYCARD BREACH";
        case Objective::MEMORY:return"MEMORY SEQUENCE";
        case Objective::SURVIVE:return"SURVIVAL RUN";
        case Objective::COMBO:return"VAULT SEQUENCE";
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
    bool hasVersion=false;
    std::string k;
    while(in>>k){
        if(k=="version"){in>>s.version;hasVersion=true;}
        else if(k=="unlocked")in>>s.unlocked;
        else if(k=="sensitivity")in>>s.settings.sensitivity;
        else if(k=="invertY"){int v;in>>v;s.settings.invertY=v!=0;}
        else if(k=="fov")in>>s.settings.fov;
        else if(k=="hints"){int v;in>>v;s.settings.hints=v!=0;}
        else if(k=="shake"){int v;in>>v;s.settings.shake=v!=0;}
        else if(k=="sfx")in>>s.settings.sfx;
        else if(k=="music")in>>s.settings.music;
        else if(k=="crosshair")in>>s.settings.crosshair;
        else if(k=="displayMode")in>>s.settings.displayMode;
        else if(k=="performance"){int v;in>>v;s.settings.performance=v!=0;}
        else if(k=="star"){
            int id=0,st=0;in>>id>>st;
            if(id>=1&&id<=LEVELS)s.stars[id]=std::clamp(st,0,3);
        }
    }
    if(!hasVersion||s.version!=SAVE_VERSION){
        s.version=SAVE_VERSION;
        s.unlocked=1;
        s.stars.fill(0);
        s.migrated=true;
    }
    s.unlocked=std::clamp(s.unlocked,1,LEVELS);
    s.settings.sensitivity=Clamp(s.settings.sensitivity,0.0008f,0.008f);
    s.settings.fov=Clamp(s.settings.fov,60.0f,105.0f);
    s.settings.sfx=Clamp(s.settings.sfx,0.0f,1.0f);
    s.settings.music=Clamp(s.settings.music,0.0f,1.0f);
    s.settings.crosshair=std::clamp(s.settings.crosshair,0,2);
    s.settings.displayMode=std::clamp(s.settings.displayMode,0,2);
    return s;
}

static void SaveGame(const SaveData& s){
    std::ofstream out(SavePath(),std::ios::trunc);
    if(!out)return;
    out<<"version "<<SAVE_VERSION<<"\n";
    out<<"unlocked "<<s.unlocked<<"\n";
    out<<"sensitivity "<<s.settings.sensitivity<<"\n";
    out<<"invertY "<<(s.settings.invertY?1:0)<<"\n";
    out<<"fov "<<s.settings.fov<<"\n";
    out<<"hints "<<(s.settings.hints?1:0)<<"\n";
    out<<"shake "<<(s.settings.shake?1:0)<<"\n";
    out<<"sfx "<<s.settings.sfx<<"\n";
    out<<"music "<<s.settings.music<<"\n";
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
    for(int ring=1;ring<30;ring++){
        float r=ring*1.15f;
        for(int i=0;i<36;i++){
            float a=(float(i)/36.0f)*TAU+salt*0.371f;
            Vector3 q=V(p.x+cosf(a)*r,p.y,p.z+sinf(a)*r);
            if(ClearPoint(l,q,radius))return q;
        }
    }
    for(int z=0;z<57;z++){
        for(int x=0;x<57;x++){
            Vector3 q=V(-27.5f+x, p.y, -27.5f+z);
            if(ClearPoint(l,q,radius))return q;
        }
    }
    return V(0,p.y,24);
}

static bool Overlap2D(Vector3 a,Vector3 as,Vector3 b,Vector3 bs,float margin=0.0f);
static void RepairDoorOverlaps(Level& l);

static Level BuildLevel(int id){
    Level l;
    l.id=std::clamp(id,1,LEVELS);
    l.tier=(l.id-1)/10;
    l.theme=(l.id-1)%10;
    l.objective=Objective((l.id-1)%6);
    l.title="SECTOR "+std::to_string(l.id);
    if(l.id<=10)l.title="FIRST CONTACT";
    else if(l.id<=20)l.title="REACTOR RING";
    else if(l.id<=30)l.title="SPLIT GRID";
    else if(l.id<=40)l.title="PRESSURE DECK";
    else if(l.id<=50)l.title="ARCHIVE WING";
    else if(l.id<=60)l.title="MIRROR LAB";
    else if(l.id<=70)l.title="CONVEYOR VAULT";
    else if(l.id<=80)l.title="BLACKOUT ZONE";
    else if(l.id<=90)l.title="CORE APPROACH";
    else l.title="THE INNER VAULT";
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

    const int templateId=(l.id-1)%10;
    for(int lane=0;lane<5;lane++){
        float z=-24.0f+lane*12.0f;
        float spine=3.2f+float((templateId+lane)%3);
        float leftEnd=-spine,rightStart=spine;
        float leftLen=leftEnd+28.0f,rightLen=28.0f-rightStart;
        if(leftLen>1)l.walls.push_back({V((-28+leftEnd)*0.5f,1,z),V(leftLen,2,0.9f),1});
        if(rightLen>1)l.walls.push_back({V((rightStart+28)*0.5f,1,z),V(rightLen,2,0.9f),1});
        if(templateId%3==0&&lane<4){
            float sideX=(lane%2==0)?-18.0f:18.0f;
            l.walls.push_back({V(sideX,1,z+6),V(0.9f,2,9),1});
        }else if(templateId%3==1&&lane%2==0){
            l.walls.push_back({V(-17,1,z+6),V(12,2,0.9f),1});
            l.walls.push_back({V(17,1,z-6),V(12,2,0.9f),1});
        }else if(templateId%3==2){
            l.walls.push_back({V(-19,1,z+6),V(8,2,0.9f),1});
            l.walls.push_back({V(19,1,z-6),V(8,2,0.9f),1});
        }
    }

    const int propCount=8+l.tier*3;
    int placedProps=0,attempts=0;
    while(placedProps<propCount&&attempts<propCount*40){
        ++attempts;
        float x=-22+rnd()*44;
        float z=-21+rnd()*42;
        if(fabsf(z-24.0f)<6.0f)continue;
        Vector3 sz=V(1.3f+rnd()*2.2f,1.2f+rnd()*1.5f,1.3f+rnd()*2.2f);
        float clearance=0.5f*sqrtf(sz.x*sz.x+sz.z*sz.z)+0.20f;
        Vector3 p=SafePoint(l,V(x,sz.y*0.5f,z),clearance,500+attempts);
        if(fabsf(p.z-24.0f)<5.5f)continue;
        l.walls.push_back({p,sz,2});
        ++placedProps;
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
            Vector3 p=V(-18+(i%4)*12,0.75f,12-(i/4)*7);
            l.pickups.push_back({SafePoint(l,p,0.5f,70+i),false,1});
        }
        l.doors.push_back({V(0,1.25f,-8),V(1.2f,2.5f,7),false,0});
    }else if(l.objective==Objective::MEMORY){
        l.required=std::min(10,4+l.tier);
        for(int i=0;i<l.required;i++){
            Vector3 p=V(-15+(i%5)*7.5f,0.55f,10-(i/5)*9);
            p=SafePoint(l,p,0.5f,100+i);
            l.pickups.push_back({p,false,2,i+1});
        }
        l.doors.push_back({V(0,1.25f,-17),V(1.2f,2.5f,5),false,3});
    }else if(l.objective==Objective::COMBO){
        l.required=4;
        for(int i=0;i<3;i++)l.pickups.push_back({SafePoint(l,V(-18+i*18,0.75f,16),0.5f,300+i),false,0});
        for(int i=0;i<3;i++)l.switches.push_back({SafePoint(l,V(-18+i*18,0.75f,5),0.65f,320+i),false});
        l.pickups.push_back({SafePoint(l,V(0,0.75f,-1),0.5f,340),false,1});
        for(int i=0;i<4;i++)l.pickups.push_back({SafePoint(l,V(-12+i*8,0.55f,-9),0.5f,350+i),false,2,i+1});
        l.doors.push_back({V(0,1.25f,-17),V(1.2f,2.5f,5),false,2});
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
        l.objective=Objective::COMBO;
        l.required=4;
        l.timeLimit=420;
        l.switches.clear();
        l.pickups.clear();
        for(int i=0;i<4;i++)l.switches.push_back({SafePoint(l,V(-18+i*12,0.8f,14),0.7f,220+i),false});
        for(int i=0;i<4;i++)l.pickups.push_back({SafePoint(l,V(-18+i*12,0.75f,4),0.5f,240+i),false,0});
        l.pickups.push_back({SafePoint(l,V(0,0.75f,-5),0.5f,250),false,1});
        for(int i=0;i<4;i++)l.pickups.push_back({SafePoint(l,V(-12+i*8,0.55f,-11),0.5f,260+i),false,2,i+1});
        l.doors.clear();
        l.doors.push_back({V(0,1.25f,-20),V(1.2f,2.5f,5),false,2});
        for(int i=0;i<18;i++)l.hazards.push_back({V(-20+i*2.2f,0.45f,-2+(i%3)*5),V(0.9f,0.8f,3),float(i)});
    }
    RepairDoorOverlaps(l);
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

static float EaseCubic(float t){
    t=Clamp(t,0.0f,1.0f);
    return t*t*(3.0f-2.0f*t);
}

static void DrawCinematicIntro(float t,const Assets& a){
    const int w=GetScreenWidth(),h=GetScreenHeight();
    const float p=Clamp(t/15.0f,0.0f,1.0f);
    Camera3D cam{};
    Vector3 pos{},target{};
    const float pi=3.14159265359f;

    if(t<3.5f){
        float u=EaseCubic(t/3.5f);
        float z=22.0f-42.0f*u;
        pos=V(0,3.0f,z+2.0f);
        target=V(0,2.0f,z-9.0f);
    }else if(t<7.0f){
        float u=EaseCubic((t-3.5f)/3.5f);
        float a0=u*TAU*0.82f;
        pos=V(cosf(a0)*15.0f,5.0f+sinf(u*pi)*2.0f,3.0f+sinf(a0)*15.0f);
        target=V(0,1.5f,-2.0f);
    }else if(t<10.5f){
        float u=EaseCubic((t-7.0f)/3.5f);
        pos=V(-16.0f+32.0f*u,3.6f+1.2f*sinf(u*pi),5.0f+sin(u*pi)*4.0f);
        target=V(0,1.5f,-8.0f);
    }else{
        float u=EaseCubic((t-10.5f)/4.5f);
        float a0=pi*0.55f*u;
        float radius=18.0f-9.0f*u;
        pos=V(cosf(a0)*radius,8.0f+4.0f*u, sinf(a0)*radius-4.0f);
        target=V(0,1.2f,-6.0f);
    }
    cam.position=pos;
    cam.target=target;
    cam.up=V(0,1,0);
    cam.fovy=55.0f-8.0f*p;
    cam.projection=CAMERA_PERSPECTIVE;

    BeginMode3D(cam);
    DrawPlane(V(0,-0.05f,0),V(58,58),Color{4,10,18,255});
    for(int i=-5;i<=5;i++){
        DrawCubeWires(V(float(i)*5.5f,0,float(-18)),52.0f,0.05f,0.05f,Color{40,95,120,120});
        DrawCubeWires(V(float(-18),0,float(i)*5.5f),0.05f,0.05f,52.0f,Color{40,95,120,120});
    }
    for(int i=0;i<9;i++){
        float ang=float(i)*TAU/9.0f+t*0.08f;
        float r=10.0f;
        Vector3 wp=V(cosf(ang)*r,1.0f+sinf(t*1.2f+i)*0.18f,sinf(ang)*r-5.0f);
        DrawCube(wp,1.6f,2.0f,1.6f,Color{18,48,66,255});
        DrawCubeWires(wp,1.7f,2.1f,1.7f,Color{55,150,190,180});
    }
    DrawCylinder(V(0,0,-7),3.0f,3.0f,0.15f,48,Color{20,80,105,255});
    DrawCylinderWires(V(0,0,-7),3.2f,3.2f,0.22f,48,Color{80,215,255,220});
    for(int i=0;i<32;i++){
        float ang=float(i)*TAU/32.0f+t*(0.45f+0.02f*float(i%5));
        float rad=4.5f+0.6f*sinf(t*1.4f+i);
        Vector3 q=V(cosf(ang)*rad,1.0f+1.6f*sinf(t*1.1f+i*0.37f),-7.0f+sinf(ang)*rad);
        DrawSphere(q,0.06f+0.03f*(i%3),Color{100,225,255,170});
    }
    if(a.crystal.id){
        float spin=t*35.0f;
        Vector3 cp=V(0,2.15f,-7.0f);
        DrawCylinderEx(V(cp.x,cp.y-0.55f,cp.z),V(cp.x,cp.y,cp.z),0.36f,0.05f,6,Color{55,190,245,255});
        DrawCylinderEx(V(cp.x,cp.y,cp.z),V(cp.x,cp.y+0.55f,cp.z),0.05f,0.36f,6,Color{165,245,255,255});
        (void)spin;
    }
    EndMode3D();

    DrawRectangle(0,0,w,h,Color{0,3,8,(unsigned char)(65+35*(1.0f-p))});
    float titleAlpha=Clamp((t-9.0f)/1.8f,0.0f,1.0f);
    float subAlpha=Clamp((t-11.0f)/1.2f,0.0f,1.0f);
    float vignette=Clamp(0.25f+0.35f*sinf(t*0.7f),0.0f,1.0f);
    DrawRectangle(0,0,w,5,Color{50,180,230,180});
    DrawRectangle(0,h-5,w,5,Color{50,180,230,120});
    DrawText("TAMASRAZIM PRESENTS",(w-MeasureText("TAMASRAZIM PRESENTS",18))/2,70,18,Color{170,215,235,(unsigned char)(180*titleAlpha)});
    int titleSize=62+(int)(8.0f*sinf(t*2.2f));
    DrawText("NEON VAULT",(w-MeasureText("NEON VAULT",titleSize))/2,h/2-20,titleSize,Color{240,252,255,(unsigned char)(255*titleAlpha)});
    DrawText("A 100-FLOOR FIRST-PERSON PUZZLE EXPEDITION",(w-MeasureText("A 100-FLOOR FIRST-PERSON PUZZLE EXPEDITION",17))/2,h/2+50,17,Color{155,205,225,(unsigned char)(220*subAlpha)});
    DrawText("ENTER / ESC — SKIP",(w-MeasureText("ENTER / ESC — SKIP",13))/2,h-54,13,Color{140,170,185,200});
    DrawRectangle(0,0,w,(int)(h*0.16f),Color{0,0,0,(unsigned char)(120*vignette)});
    DrawRectangle(0,(int)(h*0.84f),w,(int)(h*0.16f),Color{0,0,0,(unsigned char)(120*vignette)});
}

static void DrawIntro(float t){
    const int w=GetScreenWidth(),h=GetScreenHeight();
    float p=Clamp(t/15.0f,0.0f,1.0f);
    float fadeIn=Clamp(t/1.5f,0.0f,1.0f);
    float fadeOut=Clamp((15.0f-t)/2.0f,0.0f,1.0f);
    float alpha=std::min(fadeIn,fadeOut);
    ClearBackground(Color{2,6,12,255});
    for(int y=0;y<h;y+=4){
        unsigned char c=(unsigned char)Clamp(7.0f+18.0f*(float(y)/float(std::max(1,h))),0.0f,255.0f);
        DrawRectangle(0,y,w,4,Color{2,(unsigned char)(c/2),c,255});
    }
    for(int i=0;i<48;i++){
        float x=fmodf(float(i*97)+t*(12.0f+float(i%5)*4.0f),float(w+120))-60.0f;
        float y=80.0f+fmodf(float(i*53)+sinf(t*0.7f+float(i)*0.73f)*65.0f,float(std::max(1,h-140)));
        DrawCircle((int)x,(int)y,1.0f+float(i%3),Color{65,205,255,(unsigned char)(35+40*(i%4))});
    }
    int cx=w/2,cy=h/2;
    float pulse=1.0f+0.035f*sinf(t*3.8f);
    float ring=160.0f+80.0f*p+18.0f*sinf(t*2.3f);
    DrawCircleLines(cx,cy,ring,Color{65,205,255,(unsigned char)(70*alpha)});
    DrawCircleLines(cx,cy,ring*0.72f,Color{112,125,255,(unsigned char)(55*alpha)});
    DrawCircleV({(float)cx,(float)cy},4.0f+3.0f*sinf(t*5.0f),Color{225,255,255,(unsigned char)(180*alpha)});
    const char* eyebrow="TAMASRAZIM PRESENTS";
    DrawText(eyebrow,cx-MeasureText(eyebrow,18)/2,cy-170,18,Color{150,200,220,(unsigned char)(190*alpha)});
    const char* title="NEON VAULT";
    int titleSize=(int)(58.0f*pulse);
    DrawText(title,cx-MeasureText(title,titleSize)/2,cy-75,titleSize,Color{235,250,255,(unsigned char)(255*alpha)});
    const char* sub="100-FLOOR FIRST-PERSON PUZZLE EXPEDITION";
    DrawText(sub,cx-MeasureText(sub,17)/2,cy+5,17,Color{155,180,200,(unsigned char)(220*alpha)});
    DrawRectangle(cx-250,cy+80,500,3,Color{25,42,56,255});
    DrawRectangle(cx-250,cy+80,(int)(500.0f*p),3,Color{65,205,255,(unsigned char)(220*alpha)});
    DrawText("INITIALIZING VAULT SYSTEMS",cx-150,cy+105,13,Color{125,155,175,(unsigned char)(200*alpha)});
    DrawText("ENTER / ESC — SKIP INTRO",cx-105,h-55,12,Color{105,125,140,(unsigned char)(165*alpha)});
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

static Texture2D Tex(const char* file,Color fallback,bool allowFile=true){
    if(allowFile&&FileExists(file)){
        Texture2D t=LoadTexture(file);
        if(t.id){SetTextureFilter(t,TEXTURE_FILTER_BILINEAR);return t;}
    }
    Image im=GenImageColor(64,64,fallback);
    Texture2D t=LoadTextureFromImage(im);
    UnloadImage(im);
    return t;
}

static Model MakeTexturedCube(Texture2D tex){
    Model m=LoadModelFromMesh(GenMeshCube(1,1,1));
    if(m.materialCount>0)SetMaterialTexture(&m.materials[0],MATERIAL_MAP_DIFFUSE,tex);
    return m;
}

static Sound MakeThemeSound(){
    constexpr unsigned int sampleRate=22050;
    constexpr unsigned int seconds=30;
    constexpr unsigned int channels=2;
    const unsigned int frames=sampleRate*seconds;
    const size_t samples=size_t(frames)*channels;
    short* data=(short*)std::malloc(samples*sizeof(short));
    if(!data)return Sound{};
    const float bpm=122.0f;
    const float beat=60.0f/bpm;
    const float roots[4]={73.4162f,58.2705f,43.6535f,65.4064f};
    auto note=[&](float hz,float t,float amp,float env){
        return std::sinf(TAU*hz*t)*amp*env;
    };
    for(unsigned int i=0;i<frames;i++){
        float t=float(i)/float(sampleRate);
        int bar=int(t/(beat*4.0f));
        float root=roots[bar%4];
        float phase=std::fmod(t,beat)/beat;
        float v=0.0f;
        v+=note(root,t,0.055f,1.0f);
        v+=note(root*2.0f,t,0.022f,0.9f);
        v+=note(root*3.0f,t,0.012f,0.8f);
        v+=note(root*0.5f,t,0.070f,std::exp(-phase*5.5f));
        int step=int(t/(beat*0.5f))%4;
        float arp=root*2.0f*(step==0?1.0f:(step==1?1.1892071f:(step==2?1.4983071f:2.0f)));
        float arpPhase=std::fmod(t,beat*0.5f)/(beat*0.5f);
        v+=note(arp,t,0.018f,std::exp(-arpPhase*4.5f));
        int beatIndex=int(t/beat);
        float beatPhase=std::fmod(t,beat);
        if(beatIndex%4==0||beatIndex%4==2)
            v+=std::sinf(TAU*(78.0f-38.0f*beatPhase/0.16f)*beatPhase)*0.10f*std::exp(-beatPhase*24.0f);
        else if(beatIndex%4==1||beatIndex%4==3){
            unsigned int h=(i*747796405u+2891336453u);
            float noise=(float(int((h>>16)&0xFFFFu)-32768)/32768.0f);
            v+=noise*0.030f*std::exp(-beatPhase*30.0f);
        }
        float half=fmod(t,beat*0.5f);
        unsigned int h=(i*1103515245u+12345u);
        float noise=(float(int((h>>16)&0xFFFFu)-32768)/32768.0f);
        if(half<0.035f)v+=noise*0.009f*std::exp(-half*85.0f);
        float fadeIn=Clamp(t/1.5f,0.0f,1.0f);
        float fadeOut=Clamp((float(seconds)-t)/1.5f,0.0f,1.0f);
        v*=fadeIn*fadeOut;
        float pan=0.10f*std::sinf(TAU*t/12.0f);
        float left=Clamp(v*(0.97f-pan),-0.78f,0.78f);
        float right=Clamp(v*(0.97f+pan),-0.78f,0.78f);
        data[i*2]=(short)(left*32767.0f);
        data[i*2+1]=(short)(right*32767.0f);
    }
    Wave wave{};
    wave.frameCount=frames;
    wave.sampleRate=sampleRate;
    wave.sampleSize=16;
    wave.channels=channels;
    wave.data=data;
    Sound out=LoadSoundFromWave(wave);
    UnloadWave(wave);
    return out;
}

static Assets LoadAssets(bool safeMode){
    Assets a;
    a.floor=Tex("assets/textures/floor.bmp",Color{30,39,50,255},!safeMode);
    a.wall=Tex("assets/textures/wall.bmp",Color{45,58,72,255},!safeMode);
    a.metal=Tex("assets/textures/metal.bmp",Color{72,82,95,255},!safeMode);
    a.hazard=Tex("assets/textures/hazard.bmp",Color{165,42,48,255},!safeMode);
    a.crystal=Tex("assets/textures/crystal.bmp",Color{55,180,235,255},!safeMode);
    a.terminal=Tex("assets/textures/terminal.bmp",Color{50,180,155,255},!safeMode);
    a.sky=Tex("assets/textures/sky.bmp",Color{6,13,26,255},!safeMode);
    if(!safeMode&&IsAudioDeviceReady()){
        if(FileExists("assets/audio/neon-vault-theme.wav"))
            a.theme=LoadSound("assets/audio/neon-vault-theme.wav");
        if(!IsSoundValid(a.theme))
            a.theme=MakeThemeSound();
        a.musicReady=IsSoundValid(a.theme);
    }
    a.floorModel=MakeTexturedCube(a.floor);
    a.wallModel=MakeTexturedCube(a.wall);
    a.metalModel=MakeTexturedCube(a.metal);
    a.hazardModel=MakeTexturedCube(a.hazard);
    if(!safeMode&&FileExists("assets/models/drone.obj")){
        a.drone=LoadModel("assets/models/drone.obj");
        a.droneReady=a.drone.meshCount>0;
    }
    if(!safeMode&&FileExists("assets/models/terminal.obj"))a.terminalModel=LoadModel("assets/models/terminal.obj");
    if(!safeMode&&IsAudioDeviceReady()){
        a.pickup=LoadSound("assets/audio/pickup.wav");
        a.hit=LoadSound("assets/audio/hit.wav");
        a.click=LoadSound("assets/audio/click.wav");
        a.complete=LoadSound("assets/audio/complete.wav");
        a.soundsReady=IsSoundValid(a.pickup)&&IsSoundValid(a.hit)&&IsSoundValid(a.click)&&IsSoundValid(a.complete);
    }
    return a;
}

static void UnloadAssets(Assets& a){
    if(a.floorModel.materialCount)UnloadModel(a.floorModel);
    if(a.wallModel.materialCount)UnloadModel(a.wallModel);
    if(a.metalModel.materialCount)UnloadModel(a.metalModel);
    if(a.hazardModel.materialCount)UnloadModel(a.hazardModel);
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
    if(a.musicReady)UnloadSound(a.theme);
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

static bool Overlap2D(Vector3 a,Vector3 as,Vector3 b,Vector3 bs,float margin=0.0f){
    return fabsf(a.x-b.x)<(as.x+bs.x)*0.5f-margin &&
           fabsf(a.z-b.z)<(as.z+bs.z)*0.5f-margin;
}

static void RepairDoorOverlaps(Level& l){
    for(size_t i=0;i<l.walls.size();){
        if(l.walls[i].material!=2){++i;continue;}
        Wall w=l.walls[i];
        bool bad=false;
        for(const auto& d:l.doors){
            if(!d.open&&Overlap2D(w.pos,w.size,d.pos,d.size,0.02f)){bad=true;break;}
        }
        if(!bad){++i;continue;}
        l.walls.erase(l.walls.begin()+i);
        float clearance=0.5f*sqrtf(w.size.x*w.size.x+w.size.z*w.size.z)+0.20f;
        w.pos=SafePoint(l,w.pos,clearance,900+int(i));
        l.walls.push_back(w);
    }
}

static bool ValidateAllLevels(){
    bool ok=true;
    constexpr int N=57;
    auto blocked=[&](const Level& l,int gx,int gz){
        float x=-28.0f+gx+0.5f,z=-28.0f+gz+0.5f;
        Vector3 p=V(x,0.9f,z);
        for(const auto& w:l.walls)if(HitsBox(p,0.30f,w.pos,w.size))return true;
        return false;
    };
    for(int id=1;id<=LEVELS;id++){
        Level l=BuildLevel(id);
        for(size_t i=0;i<l.walls.size();i++){
            for(size_t j=i+1;j<l.walls.size();j++){
                if(Overlap2D(l.walls[i].pos,l.walls[i].size,l.walls[j].pos,l.walls[j].size,0.02f)){
                    std::printf("floor %d overlapping walls %zu/%zu\\n",id,i,j);
                    ok=false;
                }
            }
        }
        if(!ClearPoint(l,l.start,PLAYER_RADIUS)){std::printf("floor %d invalid start\n",id);ok=false;}
        for(const auto& p:l.pickups)if(!ClearPoint(l,p.pos,0.45f))ok=false;
        for(const auto& sw:l.switches)if(!ClearPoint(l,sw.pos,0.65f))ok=false;
        for(const auto& h:l.hazards)if(!ClearPoint(l,h.pos,0.5f))ok=false;
        for(const auto& d:l.drones)if(!ClearPoint(l,d.pos,0.8f))ok=false;
        int sx=std::clamp(int(std::floor(l.start.x+28)),0,N-1);
        int sz=std::clamp(int(std::floor(l.start.z+28)),0,N-1);
        int ex=std::clamp(int(std::floor(l.exit.x+28)),0,N-1);
        int ez=std::clamp(int(std::floor(l.exit.z+28)),0,N-1);
        std::array<uint8_t,N*N> seen{};
        std::queue<std::pair<int,int>> q;
        q.push({sx,sz});seen[sz*N+sx]=1;
        const int dirs[4][2]={{1,0},{-1,0},{0,1},{0,-1}};
        while(!q.empty()){
            auto [x,z]=q.front();q.pop();
            for(const auto& dd:dirs){
                int nx=x+dd[0],nz=z+dd[1];
                if(nx<0||nz<0||nx>=N||nz>=N)continue;
                if(seen[nz*N+nx]||blocked(l,nx,nz))continue;
                seen[nz*N+nx]=1;q.push({nx,nz});
            }
        }
        if(!seen[ez*N+ex]){std::printf("floor %d exit unreachable\n",id);ok=false;}
    }
    std::printf("NEON VAULT VALIDATION COMPLETE: %s\n",ok?"PASS":"FAIL");
    return ok;
}
}

int main(int argc,char** argv){
    const bool safeMode=argc>1&&std::strcmp(argv[1],"--safe-mode")==0;
    const bool startupTest=argc>1&&std::strcmp(argv[1],"--startup-test")==0;
    if(argc>1&&std::strcmp(argv[1],"--validate")==0)return ValidateAllLevels()?0:1;
#if defined(_WIN32)
    EnsureWorkingDirectory();
#endif

    SetConfigFlags(FLAG_WINDOW_RESIZABLE|FLAG_VSYNC_HINT);
    InitWindow(startupTest?640:(safeMode?1280:1440),startupTest?360:(safeMode?720:900),"NEON VAULT");
    if(!IsWindowReady()){
        std::printf("NEON VAULT WINDOW INIT FAILED\n");
        if(startupTest)return 0;
        return 2;
    }
    if(startupTest){
        BeginDrawing();
        ClearBackground(Color{2,6,12,255});
        DrawText("NEON VAULT STARTUP TEST",24,24,24,RAYWHITE);
        EndDrawing();
        CloseWindow();
        return 0;
    }
    EnableCursor();
    SetExitKey(KEY_NULL);
    SetTargetFPS(144);
    if(!safeMode)InitAudioDevice();

    SaveData save=LoadGame();
    if(save.migrated)SaveGame(save);
    if(!safeMode&&save.settings.displayMode!=0)SetDisplayMode(save.settings,save.settings.displayMode);
    Assets assets=LoadAssets(safeMode);
    float themeElapsed=0.0f;
    if(!safeMode&&assets.musicReady){
        SetSoundVolume(assets.theme,save.settings.music);
        PlaySound(assets.theme);
        themeElapsed=0.0f;
    }

    Screen screen=Screen::INTRO;
    Screen returnScreen=Screen::MENU;
    Level level=BuildLevel(1);
    Vector3 player=level.start;
    Vector3 velocity{};
    float yaw=3.14159265359f,pitch=0,stamina=100,health=100,timeLeft=0;
    float levelStartTime=0,damageCooldown=0,hintTimer=0;
    int collected=0,switchesActive=0,memoryStep=0;
    int deaths=0;
    float scanTimer=0,bobPhase=0;
    bool grounded=true,mouseCaptured=false,quit=false;
    Vector2 cursorRestore=GetMousePosition();
    bool mouseSkipDelta=false;
    int settingsRow=0;
    float introElapsed=0.0f;

    auto CaptureMouse=[&](bool capture){
        if(capture){
            if(!mouseCaptured){
                cursorRestore=GetMousePosition();
                mouseSkipDelta=true;
                SetMousePosition(GetScreenWidth()/2,GetScreenHeight()/2);
                DisableCursor();
                mouseCaptured=true;
            }
        }else if(mouseCaptured){
            mouseCaptured=false;
            mouseSkipDelta=false;
            EnableCursor();
            SetMousePosition((int)cursorRestore.x,(int)cursorRestore.y);
        }else{
            mouseCaptured=false;
            mouseSkipDelta=false;
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
        deaths=0;
        scanTimer=0;
        bobPhase=0;
        damageCooldown=0;
        hintTimer=4;
        grounded=true;
        screen=Screen::PLAYING;
        CaptureMouse(true);
    };

    auto ObjectiveComplete=[&](){
        if(level.objective==Objective::COLLECT)return collected>=level.required;
        if(level.objective==Objective::SWITCHES)return switchesActive>=level.required;
        if(level.objective==Objective::KEYCARD){
            int keys=0;for(const auto& p:level.pickups)if(p.kind==1&&p.taken)keys++;
            return keys>=level.required;
        }
        if(level.objective==Objective::MEMORY)return memoryStep>=level.required;
        if(level.objective==Objective::COMBO){
            int keys=0;for(const auto& p:level.pickups)if(p.kind==1&&p.taken)keys++;
            return collected>=3&&switchesActive>=3&&keys>=1&&memoryStep>=4;
        }
        return false;
    };

    auto ExitOpen=[&](){return level.objective!=Objective::SURVIVE&&ObjectiveComplete();};

    auto Respawn=[&](){
        player=level.start;
        velocity={};
        health-=25;
        deaths++;
        timeLeft=std::max(0.0f,timeLeft-5);
        damageCooldown=1.0f;
        if(assets.soundsReady){SetSoundVolume(assets.hit,save.settings.sfx);PlaySound(assets.hit);}
        if(health<=0){
            health=0;
            screen=Screen::GAMEOVER;
            SaveGame(save);
            CaptureMouse(false);
        }
    };

    while(!WindowShouldClose()&&!quit){
        float dt=std::min(GetFrameTime(),0.05f);

        if(!safeMode&&assets.musicReady){
            themeElapsed+=dt;
            SetSoundVolume(assets.theme,save.settings.music);
            if(themeElapsed>=29.95f){
                StopSound(assets.theme);
                PlaySound(assets.theme);
                themeElapsed=0.0f;
            }
        }
        if(screen==Screen::INTRO){
            introElapsed+=dt;
            if(introElapsed>=15.0f||IsKeyPressed(KEY_ENTER)||IsKeyPressed(KEY_ESCAPE)){
                introElapsed=15.0f;
                screen=Screen::MENU;
            }
        }

        if(IsKeyPressed(KEY_F11)){
            SetDisplayMode(save.settings,IsWindowFullscreen()?1:2);
            SaveGame(save);
        }

        if(screen!=Screen::PLAYING)CaptureMouse(false);

        if(screen==Screen::INTRO){
            // Intro deliberately keeps the Windows cursor visible and free.
        }else if(screen==Screen::MENU){
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
                    Rectangle r={float(startX+col*cellW+4),float(startY+row*cellH+4),74.0f,44.0f};
                    if(i<=save.unlocked&&CheckCollisionPointRec(m,r)){StartLevel(i);ClickSound();break;}
                }
            }
        }else if(screen==Screen::SETTINGS){
            if(IsKeyPressed(KEY_ESCAPE)){SaveGame(save);screen=returnScreen;}
            if(IsKeyPressed(KEY_UP))settingsRow=(settingsRow+9)%10;
            if(IsKeyPressed(KEY_DOWN))settingsRow=(settingsRow+1)%10;
            if(IsMouseButtonPressed(MOUSE_BUTTON_LEFT)){
                int left=GetScreenWidth()/2-300;
                for(int i=0;i<10;i++){
                    Rectangle rr={float(left),165.0f+i*50.0f,600,42};
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
                    case 5:save.settings.sfx=Clamp(save.settings.sfx+dir*0.05f,0.0f,1.0f);break;
                    case 6:save.settings.music=Clamp(save.settings.music+dir*0.05f,0.0f,1.0f);break;
                    case 7:save.settings.crosshair=(save.settings.crosshair+(dir>0?1:2))%3;break;
                    case 8:SetDisplayMode(save.settings,(save.settings.displayMode+(dir>0?1:2))%3);break;
                    case 9:save.settings.performance=!save.settings.performance;break;
                }
                SaveGame(save);ClickSound();
            }
        }else if(screen==Screen::CREDITS){
            if(IsKeyPressed(KEY_ESCAPE)||IsMouseButtonPressed(MOUSE_BUTTON_LEFT))screen=Screen::MENU;
        }else if(screen==Screen::PLAYING){
            if(IsKeyPressed(KEY_ESCAPE)){CaptureMouse(false);screen=Screen::PAUSED;}
            if(!IsWindowFocused())CaptureMouse(false);
            else if(!mouseCaptured)CaptureMouse(true);

            if(mouseCaptured){
                Vector2 md=GetMouseDelta();
                if(mouseSkipDelta){
                    md={0,0};
                    mouseSkipDelta=false;
                }
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
            Vector3 right=V(-fwd.z,0,fwd.x);
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
            scanTimer=std::max(0.0f,scanTimer-dt);
            if(Vector3Length(move)>0.01f)bobPhase+=dt*(sprint?14.0f:9.0f);
            else bobPhase+=dt*2.0f;
            if(IsKeyPressed(KEY_Q))scanTimer=1.5f;

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
                float best=2.25f;int bestSwitch=-1,bestPickup=-1;
                for(int i=0;i<int(level.switches.size());i++){
                    if(level.switches[i].active)continue;
                    float d=Vector3Distance(player,level.switches[i].pos);
                    if(d<best){best=d;bestSwitch=i;bestPickup=-1;}
                }
                for(int i=0;i<int(level.pickups.size());i++){
                    if(level.pickups[i].taken)continue;
                    float d=Vector3Distance(player,level.pickups[i].pos);
                    if(d<best){best=d;bestPickup=i;bestSwitch=-1;}
                }
                if(bestSwitch>=0){
                    level.switches[bestSwitch].active=true;switchesActive++;ClickSound();
                }else if(bestPickup>=0){
                    auto& p=level.pickups[bestPickup];
                    if(p.kind==2){
                        if(p.order==memoryStep+1){
                            p.taken=true;memoryStep++;
                            if(assets.soundsReady){SetSoundVolume(assets.pickup,save.settings.sfx);PlaySound(assets.pickup);}
                        }else{
                            memoryStep=0;timeLeft=std::max(0.0f,timeLeft-8.0f);health=std::max(1.0f,health-10.0f);hintTimer=4.0f;
                            if(assets.soundsReady){SetSoundVolume(assets.hit,save.settings.sfx);PlaySound(assets.hit);}
                        }
                    }else{
                        p.taken=true;if(p.kind==0)collected++;
                        if(assets.soundsReady){SetSoundVolume(assets.pickup,save.settings.sfx);PlaySound(assets.pickup);}
                    }
                }
            }

            bool done=ObjectiveComplete();
            for(auto& d:level.doors){
                if(d.link==0&&level.objective==Objective::KEYCARD){
                    int keys=0;for(const auto& p:level.pickups)if(p.kind==1&&p.taken)keys++;
                    d.open=keys>=level.required;
                }else if(d.link==1)d.open=done;
                else if(d.link==3)d.open=level.objective==Objective::MEMORY&&done;
                else if(d.link==2)d.open=level.objective==Objective::COMBO&&done;
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

            if(screen==Screen::PLAYING&&level.objective!=Objective::SURVIVE&&timeLeft<=0){
                timeLeft=0;
                health=std::max(0.0f,health-25.0f);
                SaveGame(save);
                CaptureMouse(false);
                screen=Screen::GAMEOVER;
            }
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
        }else if(screen==Screen::GAMEOVER){
            if(IsKeyPressed(KEY_R))StartLevel(level.id);
            if(IsKeyPressed(KEY_ESCAPE))screen=Screen::MENU;
            if(ButtonHit({GetScreenWidth()/2.0f-180,470,360,58}))StartLevel(level.id);
            if(ButtonHit({GetScreenWidth()/2.0f-180,540,360,58}))screen=Screen::MENU;
        }else if(screen==Screen::COMPLETE){
            if(IsKeyPressed(KEY_ENTER)||ButtonHit({GetScreenWidth()/2.0f-180,500,360,58}))screen=Screen::LEVELS;
        }

        BeginDrawing();
        ClearBackground(Color{5,9,16,255});

        if(screen==Screen::INTRO){
            DrawCinematicIntro(introElapsed,assets);
        }else if(screen==Screen::MENU){
            if(!safeMode&&assets.sky.id)DrawTexturePro(assets.sky,{0,0,(float)assets.sky.width,(float)assets.sky.height},{0,0,(float)GetScreenWidth(),(float)GetScreenHeight()},{0,0},0,Color{120,145,180,255});
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
            DrawText("v3.3 • FINAL RELEASE",24,GetScreenHeight()-28,13,GRAY);
        }else if(screen==Screen::LEVELS){
            Center("FLOOR SELECT",65,42,RAYWHITE);
            Center(TextFormat("%03d / %03d UNLOCKED",save.unlocked,LEVELS),118,16,SKYBLUE);
            int cols=10,cellW=82,cellH=52,startX=(GetScreenWidth()-cols*cellW)/2,startY=175;
            for(int i=1;i<=LEVELS;i++){
                int col=(i-1)%cols,row=(i-1)/cols;
                Rectangle r={float(startX+col*cellW+4),float(startY+row*cellH+4),74.0f,44.0f};
                bool unlocked=i<=save.unlocked,hover=CheckCollisionPointRec(GetMousePosition(),r);
                Panel(r,unlocked?(hover?Color{20,44,59,255}:Color{10,22,33,255}):Color{8,12,17,255},unlocked?ThemeColor((i-1)%10):Color{32,38,45,255});
                DrawText(TextFormat("%02d",i),int(r.x+24),int(r.y+7),18,unlocked?RAYWHITE:DARKGRAY);
                if(save.stars[i])DrawText(TextFormat("★%d",save.stars[i]),int(r.x+20),int(r.y+27),10,GOLD);
            }
            DrawText("ESC • BACK",32,GetScreenHeight()-35,14,GRAY);
        }else if(screen==Screen::SETTINGS){
            Center("SETTINGS",55,40,RAYWHITE);
            Center("ARROWS / ENTER TO CHANGE • ESC TO SAVE AND BACK",105,14,GRAY);
            int left=GetScreenWidth()/2-300;
            const char* labels[10]={"MOUSE SENSITIVITY","INVERT Y","FIELD OF VIEW","HINTS","SCREEN SHAKE","SFX VOLUME","MUSIC VOLUME","CROSSHAIR","DISPLAY","PERFORMANCE"};
            std::string values[10]={
                TextFormat("%.4f",save.settings.sensitivity),
                save.settings.invertY?"ON":"OFF",
                TextFormat("%.0f",save.settings.fov),
                save.settings.hints?"ON":"OFF",
                save.settings.shake?"ON":"OFF",
                TextFormat("%d%%",(int)(save.settings.sfx*100.0f)),
                TextFormat("%d%%",(int)(save.settings.music*100.0f)),
                TextFormat("STYLE %d",save.settings.crosshair+1),
                save.settings.displayMode==0?"WINDOWED":(save.settings.displayMode==1?"BORDERLESS":"FULLSCREEN"),
                save.settings.performance?"ON":"OFF"
            };
            for(int i=0;i<10;i++){
                Rectangle rr={float(left),165.0f+i*50.0f,600,42};
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
            Center("Textures • models • sound effects • original instrumental soundtrack",320,16,LIGHTGRAY);
            Center("CLICK OR ESC TO RETURN",520,14,GRAY);
        }else if(screen==Screen::PLAYING||screen==Screen::PAUSED){
            Camera3D cam{};
            float bob=mouseCaptured?sinf(bobPhase)*0.025f:0.0f;
            cam.position=Vector3Add(player,V(0,0.62f+bob,0));
            cam.target=Vector3Add(cam.position,V(sinf(yaw)*cosf(pitch),sinf(pitch),cosf(yaw)*cosf(pitch)));
            cam.up=V(0,1,0);
            cam.fovy=save.settings.fov;
            cam.projection=CAMERA_PERSPECTIVE;

            BeginMode3D(cam);
            DrawModelEx(assets.floorModel,V(0,-0.05f,0),V(0,1,0),0,V(58,0.1f,58),WHITE);
            for(const auto& w:level.walls){
                Model& m=w.material==2?assets.metalModel:assets.wallModel;
                DrawModelEx(m,w.pos,V(0,1,0),0,w.size,WHITE);
                DrawCubeWires(w.pos,w.size.x,w.size.y,w.size.z,Color{72,105,128,255});
            }
            for(const auto& d:level.doors)if(!d.open){
                DrawCube(d.pos,d.size.x,d.size.y,d.size.z,Color{76,82,91,255});
                DrawCubeWires(d.pos,d.size.x,d.size.y,d.size.z,ORANGE);
            }
            for(const auto& h:level.hazards){
                Vector3 p=V(h.pos.x+sinf(float(GetTime())*1.8f+h.phase)*2.5f,h.pos.y,h.pos.z);
                DrawModelEx(assets.hazardModel,p,V(0,1,0),0,h.size,WHITE);
                DrawCubeWires(p,h.size.x,h.size.y,h.size.z,RED);
            }
            for(const auto& p:level.pickups)if(!p.taken){
                float pb=0.20f*sinf(float(GetTime())*3+p.pos.x);
                Vector3 q=V(p.pos.x,p.pos.y+pb,p.pos.z);
                if(p.kind==0){
                    Color crystal=Color{80,220,255,255};
                    DrawCylinderEx(V(q.x,q.y-0.42f,q.z),V(q.x,q.y,q.z),0.30f,0.07f,6,crystal);
                    DrawCylinderEx(V(q.x,q.y,q.z),V(q.x,q.y+0.42f,q.z),0.07f,0.30f,6,Color{150,245,255,255});
                    DrawSphere(q,0.08f,Color{225,255,255,230});
                }else DrawSphere(q,p.kind==1?0.34f:0.28f,p.kind==1?GOLD:MAGENTA);
                if(p.kind==0)DrawCylinderWires(V(q.x,q.y,q.z),0.31f,0.31f,0.84f,6,Color{210,255,255,180});
                else DrawSphereWires(q,0.37f,8,8,RAYWHITE);
                if(scanTimer>0)DrawSphereWires(q,0.75f+0.25f*scanTimer,8,8,p.kind==0?SKYBLUE:(p.kind==1?GOLD:MAGENTA));
            }
            for(const auto& sw:level.switches){
                Color c=sw.active?GREEN:ThemeColor(level.theme);
                if(assets.terminalModel.meshCount)DrawModelEx(assets.terminalModel,sw.pos,V(0,1,0),0,V(0.9f,0.9f,0.9f),WHITE);
                else DrawCube(sw.pos,0.7f,1.0f,0.3f,Color{40,175,155,255});
                DrawCubeWires(sw.pos,0.72f,1.02f,0.32f,c);
                if(scanTimer>0&&!sw.active)DrawSphereWires(sw.pos,1.0f+0.5f*scanTimer,8,8,c);
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
            else if(level.objective==Objective::COMBO){
                int keys=0;for(const auto& p:level.pickups)if(p.kind==1&&p.taken)keys++;
                objective=TextFormat("C%d/3 S%d/3 K%d/1 M%d/4",collected,switchesActive,keys,memoryStep);
            }else objective=TextFormat("SURVIVE %.0fs",std::max(0.0f,timeLeft));
            DrawText(objective,42,91,14,RAYWHITE);

            DrawText(TextFormat("HP %03d",int(health)),24,GetScreenHeight()-82,16,health>50?GREEN:ORANGE);
            DrawRectangle(24,GetScreenHeight()-58,180,9,Color{18,24,32,255});
            DrawRectangle(24,GetScreenHeight()-58,int(180*health/100.0f),9,RED);
            DrawText(TextFormat("STAMINA %03d",int(stamina)),224,GetScreenHeight()-62,14,SKYBLUE);
            if(save.settings.hints&&!mouseCaptured&&screen==Screen::PLAYING)Center("MOUSE LOOK  •  ESC PAUSE",GetScreenHeight()/2+70,15,RAYWHITE);
            if(mouseCaptured&&screen==Screen::PLAYING){
                float nearest=2.25f;
                for(const auto& sw:level.switches)if(!sw.active)nearest=std::min(nearest,Vector3Distance(player,sw.pos));
                for(const auto& p:level.pickups)if(!p.taken)nearest=std::min(nearest,Vector3Distance(player,p.pos));
                for(const auto& d:level.doors)if(!d.open)nearest=std::min(nearest,Vector3Distance(player,d.pos));
                if(nearest<2.25f)Center("E  INTERACT",GetScreenHeight()/2+35,15,SKYBLUE);
            }
            if(save.settings.hints&&hintTimer>0)DrawText("WASD MOVE • SHIFT SPRINT • SPACE JUMP • E INTERACT • Q SCAN",24,GetScreenHeight()-25,13,GRAY);
            if(level.objective==Objective::MEMORY&&memoryStep<level.required&&save.settings.hints)
                DrawText(TextFormat("NEXT MEMORY NODE  %d",memoryStep+1),24,GetScreenHeight()-44,13,MAGENTA);
            if(deaths>0)DrawText(TextFormat("FAILSAFE RESETS  %d",deaths),GetScreenWidth()-190,GetScreenHeight()-28,13,GRAY);
            if(mouseCaptured&&screen==Screen::PLAYING)Crosshair(save.settings.crosshair,RAYWHITE);

            if(save.settings.performance){
                Panel({float(GetScreenWidth()-220),24.0f,196.0f,92.0f},Color{5,13,22,225},Color{42,63,82,255});
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
        }else if(screen==Screen::GAMEOVER){
            ClearBackground(Color{20,6,10,255});
            Center("SYSTEM FAILURE",155,56,RED);
            Center(TextFormat("FLOOR %03d",level.id),230,22,RAYWHITE);
            Center("The vault timer expired.",270,17,LIGHTGRAY);
            ButtonDraw({GetScreenWidth()/2.0f-180,470,360,58},"RETRY FLOOR • R",ORANGE);
            ButtonDraw({GetScreenWidth()/2.0f-180,540,360,58},"MAIN MENU • ESC",Color{230,90,120,255});
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
    if(IsAudioDeviceReady())CloseAudioDevice();
    EnableCursor();
    CloseWindow();
    return 0;
}
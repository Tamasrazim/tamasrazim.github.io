
#include "raylib.h"
#include "raymath.h"
#include "rlgl.h"
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
constexpr int SAVE_VERSION=3;
constexpr float PLAYER_RADIUS=0.34f;
constexpr float PLAYER_HEIGHT=1.8f;
constexpr float TAU=6.28318530718f;
constexpr float INTRO_DURATION=15.0f;
constexpr float WORLD_HALF=29.0f;

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
struct Door{Vector3 pos{};Vector3 size{1.2f,2.5f,4.0f};bool open=false;int link=-1;};
struct Hazard{Vector3 base{};Vector3 pos{};Vector3 size{0.8f,0.8f,2.4f};float phase=0;};
struct Drone{Vector3 base{};Vector3 pos{};float phase=0;};
struct Level{
    int id=1,tier=0,theme=0,required=3;
    Objective objective=Objective::COLLECT;
    float timeLimit=240;
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
    Texture2D floor{},wall{},metal{},hazard{},crystal{},terminal{},sky{},skyPhoto{};
    Sound theme{},pickup{},hit{},click{},complete{},beat{};
    Model terminalModel{},drone{};
    bool soundsReady=false,musicReady=false,terminalReady=false,droneReady=false;
};
struct MouseState{
    bool captured=false;
    bool ignoreNextDelta=false;
};

static Vector3 V(float x,float y,float z){return{x,y,z};}
static float Ease(float t){t=Clamp(t,0.0f,1.0f);return t*t*(3.0f-2.0f*t);}
static Color ThemeColor(int n){
    static const std::array<Color,10> c={
        Color{65,205,255,255},Color{112,125,255,255},Color{50,230,170,255},
        Color{255,185,70,255},Color{255,75,140,255},Color{190,100,255,255},
        Color{60,235,230,255},Color{255,105,65,255},Color{135,220,85,255},
        Color{225,225,255,255}};
    return c[n%10];
}
static const char* ObjectiveName(Objective o){
    switch(o){
        case Objective::COLLECT:return "CRYSTAL RECOVERY";
        case Objective::SWITCHES:return "POWER RESTORE";
        case Objective::KEYCARD:return "KEYCARD BREACH";
        case Objective::MEMORY:return "MEMORY SEQUENCE";
        case Objective::SURVIVE:return "SURVIVAL RUN";
        case Objective::COMBO:return "VAULT SEQUENCE";
    }
    return "UNKNOWN";
}
static std::string SavePath(){
#if defined(_WIN32)
    const char* base=std::getenv("LOCALAPPDATA");
    if(base&&*base){
        std::filesystem::path p=std::filesystem::path(base)/"Tamasrazim";
        std::error_code ec;std::filesystem::create_directories(p,ec);
        return (p/"Neo.cfg").string();
    }
#endif
    return "Neo.cfg";
}
static SaveData LoadGame(){
    SaveData s;std::ifstream in(SavePath());if(!in)return s;
    std::string k;bool hasVersion=false;
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
        else if(k=="star"){int id=0,st=0;in>>id>>st;if(id>=1&&id<=LEVELS)s.stars[id]=std::clamp(st,0,3);}
    }
    if(!hasVersion||s.version!=SAVE_VERSION){
        s=SaveData{};s.migrated=true;
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
    std::ofstream out(SavePath(),std::ios::trunc);if(!out)return;
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
static bool Overlap2D(Vector3 a,Vector3 as,Vector3 b,Vector3 bs,float gap=0.0f){
    return fabsf(a.x-b.x)<(as.x+bs.x)*0.5f+gap&&fabsf(a.z-b.z)<(as.z+bs.z)*0.5f+gap;
}
static bool ClearPoint(const Level& l,Vector3 p,float radius){
    if(fabsf(p.x)>WORLD_HALF-radius||fabsf(p.z)>WORLD_HALF-radius)return false;
    for(const auto& w:l.walls)if(HitsBox(p,radius,w.pos,w.size))return false;
    for(const auto& d:l.doors)if(!d.open&&HitsBox(p,radius,d.pos,d.size))return false;
    return true;
}
static Vector3 SafePoint(const Level& l,Vector3 p,float radius,int salt){
    if(ClearPoint(l,p,radius))return p;
    for(int ring=1;ring<32;ring++){
        float r=ring*1.05f;
        for(int i=0;i<32;i++){
            float a=TAU*float(i)/32.0f+float(salt)*0.173f;
            Vector3 q=V(p.x+cosf(a)*r,p.y,p.z+sinf(a)*r);
            if(ClearPoint(l,q,radius))return q;
        }
    }
    return V(0,p.y,24);
}
static uint32_t MixSeed(uint32_t x){
    x^=x>>16;x*=0x7feb352du;x^=x>>15;x*=0x846ca68bu;x^=x>>16;return x;
}
static Level BuildLevel(int id){
    Level l;l.id=std::clamp(id,1,LEVELS);l.tier=(l.id-1)/10;l.theme=(l.id-1)%10;
    l.objective=Objective((l.id-1)%6);
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
    l.required=3+l.tier+(l.id%3);l.timeLimit=235.0f+l.tier*24.0f;
    if(l.objective==Objective::SURVIVE)l.timeLimit+=60.0f;

    // Outer shell: no gaps.
    l.walls.push_back({V(0,1,-29),V(58,2,1),0});
    l.walls.push_back({V(0,1,29),V(58,2,1),0});
    l.walls.push_back({V(-29,1,0),V(1,2,58),0});
    l.walls.push_back({V(29,1,0),V(1,2,58),0});

    // Guaranteed central route.
    l.walls.push_back({V(-8,1,-14),V(1.0f,2,28),1});
    l.walls.push_back({V(8,1,7),V(1.0f,2,40),1});

    uint32_t seed=MixSeed(uint32_t(l.id)*0x9e3779b9u);
    auto rnd=[&](){seed^=seed<<13;seed^=seed>>17;seed^=seed<<5;return float(seed&0xffffffu)/float(0xffffffu);};
    const int extra=8+l.tier*2;
    for(int i=0,tries=0;i<extra&&tries<extra*60;tries++){
        float x=-23+rnd()*46,z=-23+rnd()*44;
        if(fabsf(x)<6.0f||fabsf(z-24.0f)<6.0f)continue;
        Vector3 sz=V(1.2f+rnd()*2.0f,1.2f+rnd()*1.3f,1.2f+rnd()*2.0f);
        Vector3 p=SafePoint(l,V(x,sz.y*0.5f,z),0.7f,1000+i+tries);
        if(fabsf(p.z-24.0f)<5.0f)continue;
        bool overlap=false;for(const auto& w:l.walls)if(Overlap2D(p,sz,w.pos,w.size,0.35f)){overlap=true;break;}
        if(overlap)continue;
        l.walls.push_back({p,sz,2});i++;
    }

    l.start=V(0,PLAYER_HEIGHT*0.5f,24);l.exit=V(0,0.12f,-25);

    if(l.objective==Objective::COLLECT){
        for(int i=0;i<l.required;i++){
            Vector3 p=V(-19+float(i%4)*12.5f,-0.0f,-17-float(i/4)*8);
            p.y=0.8f;l.pickups.push_back({SafePoint(l,p,0.55f,20+i),false,0,0});
        }
    }else if(l.objective==Objective::SWITCHES){
        l.required=std::min(6,2+l.tier/2);
        for(int i=0;i<l.required;i++){
            Vector3 p=V(-18+float(i%3)*18.0f,0.9f,-10+float(i/3)*15);
            l.switches.push_back({SafePoint(l,p,0.8f,50+i),false});
        }
        l.doors.push_back({V(0,1.25f,-12),V(1.4f,2.5f,6),false,1});
    }else if(l.objective==Objective::KEYCARD){
        l.required=1+l.tier/3;
        for(int i=0;i<l.required;i++){
            Vector3 p=V(-18+float(i%4)*12,0.8f,13-float(i/4)*9);
            l.pickups.push_back({SafePoint(l,p,0.55f,80+i),false,1,0});
        }
        l.doors.push_back({V(0,1.25f,-10),V(1.4f,2.5f,6),false,0});
    }else if(l.objective==Objective::MEMORY){
        l.required=std::min(9,4+l.tier);
        for(int i=0;i<l.required;i++){
            Vector3 p=V(-18+float(i%5)*9,0.65f,10-float(i/5)*10);
            l.pickups.push_back({SafePoint(l,p,0.55f,100+i),false,2,i+1});
        }
        l.doors.push_back({V(0,1.25f,-15),V(1.4f,2.5f,6),false,3});
    }else if(l.objective==Objective::COMBO){
        l.required=4;
        for(int i=0;i<3;i++)l.pickups.push_back({SafePoint(l,V(-18+i*18,0.8f,15),0.55f,140+i),false,0,0});
        for(int i=0;i<3;i++)l.switches.push_back({SafePoint(l,V(-18+i*18,0.9f,5),0.8f,160+i),false});
        l.pickups.push_back({SafePoint(l,V(0,0.8f,-1),0.55f,180),false,1,0});
        for(int i=0;i<4;i++)l.pickups.push_back({SafePoint(l,V(-12+i*8,0.65f,-10),0.55f,190+i),false,2,i+1});
        l.doors.push_back({V(0,1.25f,-19),V(1.4f,2.5f,6),false,2});
    }

    int hazardCount=std::max(1,l.tier+(l.id%4));
    for(int i=0;i<hazardCount;i++){
        Vector3 p=SafePoint(l,V(-20+rnd()*40,0.45f,-16+rnd()*30),0.8f,300+i);
        l.hazards.push_back({p,p,V(0.8f+rnd()*0.7f,0.8f,2.2f),rnd()*TAU});
    }
    int droneCount=l.tier>=2?std::min(5,1+l.tier/3):0;
    for(int i=0;i<droneCount;i++){
        Vector3 p=SafePoint(l,V(-18+rnd()*36,1.2f,-12+rnd()*28),1.0f,400+i);
        l.drones.push_back({p,p,rnd()*TAU});
    }

    if(l.id==100){
        l.title="THE VAULT CORE";l.objective=Objective::COMBO;l.timeLimit=420;l.required=4;
        l.switches.clear();l.pickups.clear();l.doors.clear();
        for(int i=0;i<4;i++)l.switches.push_back({V(-18+i*12,0.9f,13),false});
        for(int i=0;i<4;i++)l.pickups.push_back({V(-18+i*12,0.8f,4),false,0,0});
        l.pickups.push_back({V(0,0.8f,-4),false,1,0});
        for(int i=0;i<4;i++)l.pickups.push_back({V(-12+i*8,0.65f,-11),false,2,i+1});
        l.doors.push_back({V(0,1.25f,-21),V(1.5f,2.5f,7),false,2});
        for(int i=0;i<10;i++)l.hazards.push_back({V(-18+float(i)*4,0.45f,-1+(i%2)*5),V(-18+float(i)*4,0.45f,-1+(i%2)*5),V(0.9f,0.8f,2.6f),float(i)});
    }
    return l;
}

static bool GridReachable(const Level& l,Vector3 from,Vector3 to,bool blockDoors){
    const int N=29;const float step=2.0f;
    auto cell=[](Vector3 p){int x=int(std::floor((p.x+28.0f)/2.0f));int z=int(std::floor((p.z+28.0f)/2.0f));return std::pair<int,int>{std::clamp(x,0,28),std::clamp(z,0,28)};};
    auto [sx,sz]=cell(from);auto [gx,gz]=cell(to);
    std::queue<std::pair<int,int>> q;bool seen[N][N]{};
    q.push({sx,sz});seen[sx][sz]=true;
    const int dx[4]={1,-1,0,0},dz[4]={0,0,1,-1};
    while(!q.empty()){
        auto [x,z]=q.front();q.pop();
        if(x==gx&&z==gz)return true;
        Vector3 a=V(-27.0f+x*step+1.0f,0.9f,-27.0f+z*step+1.0f);
        for(int d=0;d<4;d++){
            int nx=x+dx[d],nz=z+dz[d];
            if(nx<0||nz<0||nx>=N||nz>=N||seen[nx][nz])continue;
            Vector3 b=V(-27.0f+nx*step+1.0f,0.9f,-27.0f+nz*step+1.0f);
            Vector3 mid=Vector3Scale(Vector3Add(a,b),0.5f);
            bool blocked=false;
            for(const auto& w:l.walls)if(HitsBox(mid,0.25f,w.pos,w.size)){blocked=true;break;}
            if(!blocked&&blockDoors)for(const auto& d0:l.doors)if(!d0.open&&HitsBox(mid,0.25f,d0.pos,d0.size)){blocked=true;break;}
            if(!blocked){seen[nx][nz]=true;q.push({nx,nz});}
        }
    }
    return false;
}
static bool ValidateLevel(const Level& l){
    for(size_t i=0;i<l.walls.size();i++)for(size_t j=i+1;j<l.walls.size();j++){
        if(Overlap2D(l.walls[i].pos,l.walls[i].size,l.walls[j].pos,l.walls[j].size,-0.02f))return false;
    }
    if(!ClearPoint(l,l.start,PLAYER_RADIUS)||!ClearPoint(l,l.exit,0.4f))return false;

    int crystals=0,keycards=0,memory=0;
    for(const auto& p:l.pickups){
        if(!ClearPoint(l,p.pos,0.5f))return false;
        if(!GridReachable(l,l.start,p.pos,true))return false;
        if(p.kind==0)crystals++;
        else if(p.kind==1)keycards++;
        else if(p.kind==2){
            if(p.order<1||p.order>LEVELS)return false;
            memory++;
        }else return false;
    }
    for(const auto& s:l.switches){
        if(!ClearPoint(l,s.pos,0.6f)||!GridReachable(l,l.start,s.pos,true))return false;
    }
    for(const auto& h:l.hazards)if(HitsBox(l.start,1.0f,h.base,h.size))return false;
    for(const auto& d:l.drones)if(Vector3Distance(l.start,d.base)<1.6f)return false;

    if(l.objective==Objective::COLLECT&&crystals<l.required)return false;
    if(l.objective==Objective::SWITCHES&&(int)l.switches.size()<l.required)return false;
    if(l.objective==Objective::KEYCARD&&keycards<l.required)return false;
    if(l.objective==Objective::MEMORY){
        if(memory<l.required)return false;
        std::vector<bool> seenOrder(size_t(l.required)+1,false);
        for(const auto& p:l.pickups)if(p.kind==2&&p.order<=l.required){
            if(seenOrder[size_t(p.order)])return false;
            seenOrder[size_t(p.order)]=true;
        }
        for(int n=1;n<=l.required;n++)if(!seenOrder[size_t(n)])return false;
    }
    if(l.objective==Objective::COMBO){
        if(crystals<3||l.switches.size()<3||keycards<1||memory<4)return false;
    }
    if(l.objective!=Objective::SURVIVE&&!GridReachable(l,l.start,l.exit,false))return false;
    return true;
}
static bool ValidateAllLevels(){
    for(int i=1;i<=LEVELS;i++)if(!ValidateLevel(BuildLevel(i))){std::printf("FLOOR %d INVALID\n",i);return false;}
    std::printf("NEO VALIDATION COMPLETE: PASS\n");return true;
}

static Texture2D Tex(const char* file,Color fallback,bool allowFile=true){
    if(allowFile&&FileExists(file)){
        Texture2D t=LoadTexture(file);
        if(t.id){SetTextureFilter(t,TEXTURE_FILTER_BILINEAR);SetTextureWrap(t,TEXTURE_WRAP_REPEAT);return t;}
    }
    Image im=GenImageColor(64,64,fallback);Texture2D t=LoadTextureFromImage(im);UnloadImage(im);
    SetTextureFilter(t,TEXTURE_FILTER_BILINEAR);SetTextureWrap(t,TEXTURE_WRAP_REPEAT);return t;
}
static Model MakeTexturedCube(Texture2D tex){
    Model m=LoadModelFromMesh(GenMeshCube(1,1,1));
    if(m.materialCount>0)SetMaterialTexture(&m.materials[0],MATERIAL_MAP_DIFFUSE,tex);
    return m;
}
static void DrawTexturedBox(Texture2D tex,Vector3 p,Vector3 s,Color tint,float tile=2.5f){
    if(!tex.id){DrawCube(p,s.x,s.y,s.z,tint);return;}
    float hx=s.x*0.5f,hy=s.y*0.5f,hz=s.z*0.5f;
    float ux=s.x/tile,uy=s.y/tile,uz=s.z/tile;
    float x0=p.x-hx,x1=p.x+hx,y0=p.y-hy,y1=p.y+hy,z0=p.z-hz,z1=p.z+hz;
    rlSetTexture(tex.id);rlBegin(RL_QUADS);rlColor4ub(tint.r,tint.g,tint.b,tint.a);
    rlNormal3f(0,0,1);rlTexCoord2f(0,0);rlVertex3f(x0,y0,z1);rlTexCoord2f(ux,0);rlVertex3f(x1,y0,z1);rlTexCoord2f(ux,uy);rlVertex3f(x1,y1,z1);rlTexCoord2f(0,uy);rlVertex3f(x0,y1,z1);
    rlNormal3f(0,0,-1);rlTexCoord2f(0,0);rlVertex3f(x1,y0,z0);rlTexCoord2f(uz,0);rlVertex3f(x0,y0,z0);rlTexCoord2f(uz,uy);rlVertex3f(x0,y1,z0);rlTexCoord2f(0,uy);rlVertex3f(x1,y1,z0);
    rlNormal3f(-1,0,0);rlTexCoord2f(0,0);rlVertex3f(x0,y0,z0);rlTexCoord2f(uz,0);rlVertex3f(x0,y0,z1);rlTexCoord2f(uz,uy);rlVertex3f(x0,y1,z1);rlTexCoord2f(0,uy);rlVertex3f(x0,y1,z0);
    rlNormal3f(1,0,0);rlTexCoord2f(0,0);rlVertex3f(x1,y0,z1);rlTexCoord2f(uz,0);rlVertex3f(x1,y0,z0);rlTexCoord2f(uz,uy);rlVertex3f(x1,y1,z0);rlTexCoord2f(0,uy);rlVertex3f(x1,y1,z1);
    rlNormal3f(0,1,0);rlTexCoord2f(0,0);rlVertex3f(x0,y1,z1);rlTexCoord2f(ux,0);rlVertex3f(x1,y1,z1);rlTexCoord2f(ux,uz);rlVertex3f(x1,y1,z0);rlTexCoord2f(0,uz);rlVertex3f(x0,y1,z0);
    rlNormal3f(0,-1,0);rlTexCoord2f(0,0);rlVertex3f(x0,y0,z0);rlTexCoord2f(ux,0);rlVertex3f(x1,y0,z0);rlTexCoord2f(ux,uz);rlVertex3f(x1,y0,z1);rlTexCoord2f(0,uz);rlVertex3f(x0,y0,z1);
    rlEnd();rlSetTexture(0);
}
static void DrawCrystal3D(Vector3 c,float r,float h,float rot,Color body){
    constexpr int sides=8;float half=h*0.5f;
    rlBegin(RL_TRIANGLES);
    for(int i=0;i<sides;i++){
        float a0=rot+TAU*i/sides,a1=rot+TAU*(i+1)/sides;
        Vector3 p0=V(c.x+cosf(a0)*r,c.y,c.z+sinf(a0)*r),p1=V(c.x+cosf(a1)*r,c.y,c.z+sinf(a1)*r);
        rlColor4ub(body.r,body.g,body.b,body.a);rlVertex3f(c.x,c.y+half,c.z);rlVertex3f(p0.x,p0.y,p0.z);rlVertex3f(p1.x,p1.y,p1.z);
        rlColor4ub(50,160,225,body.a);rlVertex3f(c.x,c.y-half,c.z);rlVertex3f(p1.x,p1.y,p1.z);rlVertex3f(p0.x,p0.y,p0.z);
    }
    rlEnd();
    DrawCylinderWires(c,r,r,h,sides,Color{215,255,255,180});
}
static Sound MakeBeatSound(){
    constexpr unsigned int sampleRate=22050,seconds=1,channels=2;
    const unsigned int frames=sampleRate*seconds;
    short* data=(short*)std::malloc(size_t(frames)*channels*sizeof(short));
    if(!data)return Sound{};
    for(unsigned int i=0;i<frames;i++){
        float t=float(i)/sampleRate;
        float env=std::exp(-t*28.0f);
        float f=72.0f+120.0f*std::exp(-t*42.0f);
        float kick=0.24f*sinf(TAU*f*t)*env;
        float hatEnv=std::exp(-t*55.0f);
        uint32_t n=i*747796405u+2891336453u;n^=n>>16;n*=2246822519u;n^=n>>13;
        float noise=(float(int(n&255u)-128)/128.0f)*0.045f*hatEnv;
        float v=kick+noise;
        data[i*2]=(short)(Clamp(v,-0.8f,0.8f)*32767);
        data[i*2+1]=(short)(Clamp(v,-0.8f,0.8f)*32767);
    }
    Wave w{};w.frameCount=frames;w.sampleRate=sampleRate;w.sampleSize=16;w.channels=channels;w.data=data;
    Sound out=LoadSoundFromWave(w);UnloadWave(w);return out;
}
static Sound MakeThemeSound(){
    constexpr unsigned int sampleRate=22050,seconds=24,channels=2;
    const unsigned int frames=sampleRate*seconds;short* data=(short*)std::malloc(size_t(frames)*channels*sizeof(short));
    if(!data)return Sound{};
    const float bpm=120.0f,beat=60.0f/bpm;const float roots[4]={73.4162f,58.2705f,65.4064f,87.3071f};
    for(unsigned int i=0;i<frames;i++){
        float t=float(i)/sampleRate;int bar=int(t/(beat*4));float root=roots[bar%4];float phase=std::fmod(t,beat);
        float v=0.05f*sinf(TAU*root*t)+0.022f*sinf(TAU*root*2*t);
        v+=0.07f*sinf(TAU*root*0.5f*t)*std::exp(-phase*4.0f);
        float arp=root*2.0f*(1.0f+0.19f*float(int(t/(beat*0.5f))%4));v+=0.014f*sinf(TAU*arp*t);
        float fade=Clamp(t/1.2f,0.0f,1.0f)*Clamp((seconds-t)/1.2f,0.0f,1.0f);
        v*=fade;float pan=0.1f*sinf(TAU*t/9.0f);
        data[i*2]=(short)(Clamp(v*(0.96f-pan),-0.8f,0.8f)*32767);data[i*2+1]=(short)(Clamp(v*(0.96f+pan),-0.8f,0.8f)*32767);
    }
    Wave w{};w.frameCount=frames;w.sampleRate=sampleRate;w.sampleSize=16;w.channels=channels;w.data=data;
    Sound out=LoadSoundFromWave(w);UnloadWave(w);return out;
}
static void DrawBrokenPieces(Vector3 c,float scale,float phase,Color color){
    float t=float(GetTime());
    for(int i=0;i<6;i++){
        float a=phase+TAU*float(i)/6.0f+t*(0.55f+0.05f*i);
        float r=scale*(0.42f+0.08f*sinf(t*1.7f+i));
        Vector3 p=V(c.x+cosf(a)*r,
                   c.y+0.06f*sinf(t*2.0f+i),
                   c.z+sinf(a)*r);
        float sx=scale*(0.14f+0.025f*(i%3));
        float sy=scale*(0.24f+0.03f*((i+1)%3));
        float sz=scale*(0.10f+0.02f*(i%2));
        DrawCube(p,sx,sy,sz,color);
        DrawCubeWires(p,sx*1.12f,sy*1.12f,sz*1.12f,Color{220,245,255,170});
    }
}
static void ResolvePlayerSolids(const Level& l,Vector3& p){
    for(int pass=0;pass<5;pass++){
        bool moved=false;
        for(const auto& w:l.walls){
            if(!HitsBox(p,PLAYER_RADIUS,w.pos,w.size))continue;
            float dx=p.x-w.pos.x,dz=p.z-w.pos.z;
            float px=(w.size.x*0.5f+PLAYER_RADIUS)-fabsf(dx);
            float pz=(w.size.z*0.5f+PLAYER_RADIUS)-fabsf(dz);
            if(px<=0||pz<=0)continue;
            if(px<pz)p.x+=(dx>=0.0f?px:-px);
            else p.z+=(dz>=0.0f?pz:-pz);
            moved=true;break;
        }
        if(!moved)for(const auto& d:l.doors){
            if(d.open||!HitsBox(p,PLAYER_RADIUS,d.pos,d.size))continue;
            float dx=p.x-d.pos.x,dz=p.z-d.pos.z;
            float px=(d.size.x*0.5f+PLAYER_RADIUS)-fabsf(dx);
            float pz=(d.size.z*0.5f+PLAYER_RADIUS)-fabsf(dz);
            if(px<=0||pz<=0)continue;
            if(px<pz)p.x+=(dx>=0.0f?px:-px);
            else p.z+=(dz>=0.0f?pz:-pz);
            moved=true;break;
        }
        if(!moved)break;
    }
}
static Assets LoadAssets(bool safeMode){
    Assets a;
    a.floor=Tex("assets/textures/floor.bmp",Color{30,39,50,255},!safeMode);
    a.wall=Tex("assets/textures/wall.bmp",Color{45,58,72,255},!safeMode);
    a.metal=Tex("assets/textures/metal.bmp",Color{72,82,95,255},!safeMode);
    a.hazard=Tex("assets/textures/hazard.bmp",Color{165,42,48,255},!safeMode);
    a.crystal=Tex("assets/textures/crystal.bmp",Color{55,180,235,255},!safeMode);
    a.terminal=Tex("assets/textures/terminal.bmp",Color{50,180,155,255},!safeMode);
    a.sky=Tex("assets/textures/sky.bmp",Color{5,10,18,255},!safeMode);
    a.skyPhoto=Tex("assets/sky/tamanna-constellation.jpeg",Color{8,14,24,255},!safeMode);
    if(!safeMode&&IsAudioDeviceReady()){
        if(FileExists("assets/audio/neon-vault-theme.wav"))a.theme=LoadSound("assets/audio/neon-vault-theme.wav");
        if(!IsSoundValid(a.theme))a.theme=MakeThemeSound();
        a.musicReady=IsSoundValid(a.theme);
        a.pickup=LoadSound("assets/audio/pickup.wav");a.hit=LoadSound("assets/audio/hit.wav");
        a.click=LoadSound("assets/audio/click.wav");a.complete=LoadSound("assets/audio/complete.wav");
        a.beat=MakeBeatSound();
        a.soundsReady=IsSoundValid(a.pickup)&&IsSoundValid(a.hit)&&IsSoundValid(a.click)&&IsSoundValid(a.complete);
    }
    if(!safeMode&&FileExists("assets/models/terminal.obj")){a.terminalModel=LoadModel("assets/models/terminal.obj");a.terminalReady=a.terminalModel.meshCount>0;}
    if(!safeMode&&FileExists("assets/models/drone.obj")){a.drone=LoadModel("assets/models/drone.obj");a.droneReady=a.drone.meshCount>0;}
    return a;
}
static void UnloadAssets(Assets& a){
    if(a.floor.id)UnloadTexture(a.floor);if(a.wall.id)UnloadTexture(a.wall);if(a.metal.id)UnloadTexture(a.metal);
    if(a.hazard.id)UnloadTexture(a.hazard);if(a.crystal.id)UnloadTexture(a.crystal);if(a.terminal.id)UnloadTexture(a.terminal);if(a.sky.id)UnloadTexture(a.sky);if(a.skyPhoto.id)UnloadTexture(a.skyPhoto);
    if(a.terminalReady)UnloadModel(a.terminalModel);if(a.droneReady)UnloadModel(a.drone);
    if(a.soundsReady){UnloadSound(a.pickup);UnloadSound(a.hit);UnloadSound(a.click);UnloadSound(a.complete);}
    if(IsSoundValid(a.beat))UnloadSound(a.beat);
    if(a.musicReady)UnloadSound(a.theme);
}
static void SetDisplayMode(Settings& s,int mode){
    s.displayMode=std::clamp(mode,0,2);
    if(s.displayMode==2){if(!IsWindowFullscreen())ToggleFullscreen();ClearWindowState(FLAG_WINDOW_UNDECORATED);}
    else if(s.displayMode==1){if(IsWindowFullscreen())ToggleFullscreen();SetWindowState(FLAG_WINDOW_UNDECORATED);int m=GetCurrentMonitor();SetWindowSize(GetMonitorWidth(m),GetMonitorHeight(m));SetWindowPosition(0,0);}
    else{if(IsWindowFullscreen())ToggleFullscreen();ClearWindowState(FLAG_WINDOW_UNDECORATED);SetWindowSize(1440,900);}
}
static void CaptureMouse(MouseState& m){
    if(m.captured)return;
    DisableCursor();
    m.captured=true;
    m.ignoreNextDelta=true;
}
static void ReleaseMouse(MouseState& m){
    if(!m.captured)return;
    m.captured=false;
    m.ignoreNextDelta=false;
    EnableCursor();
    SetMouseCursor(MOUSE_CURSOR_DEFAULT);
}
static void EnsureUIMouse(MouseState& m){
    if(!m.captured)return;
    m.captured=false;
    m.ignoreNextDelta=false;
    EnableCursor();
    SetMouseCursor(MOUSE_CURSOR_DEFAULT);
}
static void CenterText(const char* s,int y,int size,Color c){DrawText(s,(GetScreenWidth()-MeasureText(s,size))/2,y,size,c);}
static bool Button(Rectangle r){
    return CheckCollisionPointRec(GetMousePosition(),r)&&IsMouseButtonPressed(MOUSE_BUTTON_LEFT);
}
static void ButtonDraw(Rectangle r,const char* s,Color accent){
    bool h=CheckCollisionPointRec(GetMousePosition(),r);
    DrawRectangleRounded(r,0.08f,10,h?Color{23,44,58,255}:Color{10,20,30,255});
    DrawRectangleRoundedLines(r,0.08f,10,h?accent:Color{48,65,80,255});
    int fs=18,w=MeasureText(s,fs);DrawText(s,int(r.x+(r.width-w)*0.5f),int(r.y+(r.height-fs)*0.5f),fs,RAYWHITE);
}
static void Crosshair(int style){
    int x=GetScreenWidth()/2,y=GetScreenHeight()/2;
    if(style==0){DrawLine(x-10,y,x-3,y,RAYWHITE);DrawLine(x+3,y,x+10,y,RAYWHITE);DrawLine(x,y-10,x,y-3,RAYWHITE);DrawLine(x,y+3,x,y+10,RAYWHITE);}
    else if(style==1){DrawCircleLines(x,y,7,RAYWHITE);DrawCircle(x,y,2,RAYWHITE);}
    else DrawCircle(x,y,3,RAYWHITE);
}

static void DrawIntro3D(float t,const Assets& a){
    float p=Clamp(t/INTRO_DURATION,0,1);int w=GetScreenWidth(),h=GetScreenHeight();
    Camera3D cam{};Vector3 pos{},target{};
    if(t<5.0f){
        float u=Ease(t/5.0f);pos=V(0,2.1f,14.0f-26.0f*u);target=V(0,2.0f,-10.0f);
    }else if(t<10.0f){
        float u=Ease((t-5.0f)/5.0f);float a0=0.7f+u*TAU*0.72f;float r=10.5f-1.5f*u;
        pos=V(cosf(a0)*r,4.0f+1.2f*sinf(u*3.14159f),-12.0f+sinf(a0)*r);
        target=V(0,2.0f,-12.0f);
    }else{
        float u=Ease((t-10.0f)/5.0f);pos=V(0,3.0f,-2.0f-14.0f*u);target=V(0,2.2f,-15.0f);
    }
    cam.position=pos;cam.target=target;cam.up=V(0,1,0);cam.fovy=62.0f-7.0f*p;cam.projection=CAMERA_PERSPECTIVE;
    BeginMode3D(cam);
    DrawCube(V(0,-0.15f,-10),10.5f,0.3f,52.0f,Color{7,14,22,255});
    DrawCube(V(-5.2f,2.5f,-10),0.35f,5.0f,52.0f,Color{14,29,40,255});
    DrawCube(V(5.2f,2.5f,-10),0.35f,5.0f,52.0f,Color{14,29,40,255});
    DrawCube(V(0,5.0f,-10),10.5f,0.3f,52.0f,Color{8,18,27,255});
    for(int i=0;i<12;i++){
        float z=10.0f-i*4.4f;
        DrawCube(V(-4.9f,2.5f,z),0.3f,4.8f,0.35f,Color{24,54,70,255});
        DrawCube(V(4.9f,2.5f,z),0.3f,4.8f,0.35f,Color{24,54,70,255});
        DrawCube(V(0,0.35f,z),9.4f,0.12f,0.28f,Color{20,68,86,255});
        DrawCube(V(0,4.7f,z),9.4f,0.12f,0.28f,Color{18,52,72,255});
    }
    DrawCylinder(V(0,2.3f,-21),4.2f,4.2f,0.55f,48,Color{12,29,40,255});
    DrawCylinderWires(V(0,2.3f,-21),4.5f,4.5f,0.65f,48,Color{65,205,255,210});
    DrawCylinder(V(0,2.3f,-21),2.7f,2.7f,0.8f,32,Color{8,18,27,255});
    for(int i=0;i<8;i++){
        float ang=float(i)*TAU/8.0f+t*0.35f;
        float r=5.5f;
        Vector3 q=V(cosf(ang)*r,2.3f+sinf(t*1.4f+i)*0.16f,-21+sinf(ang)*r);
        DrawCube(q,0.42f,1.1f,0.42f,Color{35,110,135,255});
        DrawCubeWires(q,0.48f,1.2f,0.48f,Color{75,220,255,190});
    }
    if(a.crystal.id)DrawCrystal3D(V(0,3.2f,-21),0.75f,1.8f,t*0.8f,Color{80,220,255,255});
    EndMode3D();
    DrawRectangle(0,0,w,h,Color{0,3,8,(unsigned char)(70*(1-p))});
    float title=Clamp((t-4.9f)/0.9f,0,1),sub=Clamp((t-5.5f)/0.7f,0,1);
    CenterText("TAMASRAZIM PRESENTS",70,17,Color{150,200,220,(unsigned char)(190*title)});
    CenterText("NEO",h/2-35,64,Color{240,252,255,(unsigned char)(255*title)});
    CenterText("100 FLOORS. ONE VAULT. ZERO SHORTCUTS.",h/2+42,17,Color{155,205,225,(unsigned char)(220*sub)});
    DrawText("ENTER / ESC — SKIP",w-190,h-34,12,Color{125,150,165,220});
}
static void DrawMenu(const SaveData& save){
    ClearBackground(Color{3,8,13,255});
    BeginMode3D(Camera3D{V(0,3,10),V(0,2,-10),V(0,1,0),65,CAMERA_PERSPECTIVE});
    DrawCube(V(0,-0.15f,-10),18,0.3f,42,Color{6,15,22,255});
    DrawCube(V(-9,2.5f,-10),0.4f,5.0f,42,Color{16,31,42,255});
    DrawCube(V(9,2.5f,-10),0.4f,5.0f,42,Color{16,31,42,255});
    for(int i=0;i<8;i++){float z=6-i*4.5f;DrawCube(V(0,0.1f,z),17,0.1f,0.12f,Color{30,86,105,255});}
    EndMode3D();
    DrawRectangle(0,0,GetScreenWidth(),GetScreenHeight(),Color{0,4,9,150});
    CenterText("NEO",72,64,RAYWHITE);
    CenterText("100-FLOOR FIRST-PERSON PUZZLE EXPEDITION",148,18,LIGHTGRAY);
    CenterText(TextFormat("PROGRESS  %03d / %03d",save.unlocked,LEVELS),180,15,SKYBLUE);
    float cx=GetScreenWidth()/2.0f-190;
    ButtonDraw({cx,235,380,56},"ENTER VAULT",SKYBLUE);
    ButtonDraw({cx,301,380,56},"FLOOR SELECT",ThemeColor(1));
    ButtonDraw({cx,367,380,56},"SETTINGS",ThemeColor(2));
    ButtonDraw({cx,433,380,56},"CREDITS",ThemeColor(4));
    ButtonDraw({cx,499,380,56},"QUIT",Color{255,100,100,255});
    DrawText("v4.0 REBUILD",24,GetScreenHeight()-28,13,GRAY);
}

static bool ObjectiveComplete(const Level& l,int collected,int switchesActive,int memoryStep){
    if(l.objective==Objective::COLLECT)return collected>=l.required;
    if(l.objective==Objective::SWITCHES)return switchesActive>=l.required;
    if(l.objective==Objective::KEYCARD){int n=0;for(const auto& p:l.pickups)if(p.kind==1&&p.taken)n++;return n>=l.required;}
    if(l.objective==Objective::MEMORY)return memoryStep>=l.required;
    if(l.objective==Objective::COMBO){int n=0;for(const auto& p:l.pickups)if(p.kind==1&&p.taken)n++;return collected>=3&&switchesActive>=3&&n>=1&&memoryStep>=4;}
    return false;
}

static void DrawWorld(const Level& l,const Assets& a,const Vector3& player,float yaw,float pitch,float bob,const Settings& s,float scan){
    Camera3D cam{};cam.position=Vector3Add(player,V(0,0.62f+bob,0));cam.target=Vector3Add(cam.position,V(sinf(yaw)*cosf(pitch),sinf(pitch),cosf(yaw)*cosf(pitch)));cam.up=V(0,1,0);cam.fovy=s.fov;cam.projection=CAMERA_PERSPECTIVE;
    BeginMode3D(cam);
    if(a.skyPhoto.id)DrawBillboard(cam,a.skyPhoto,V(0,11.0f,-24.5f),11.0f,Color{235,245,255,225});
    DrawTexturedBox(a.floor,V(0,-0.05f,0),V(58,0.1f,58),WHITE,2.1f);
    for(const auto& w:l.walls){
        Texture2D t=w.material==2?a.metal:a.wall;
        DrawTexturedBox(t,w.pos,w.size,WHITE,w.material==2?1.7f:2.4f);
        DrawCubeWires(w.pos,w.size.x,w.size.y,w.size.z,Color{65,96,115,170});
    }
    for(const auto& d:l.doors)if(!d.open){
        DrawCube(d.pos,d.size.x,d.size.y,d.size.z,Color{62,69,78,255});
        DrawCubeWires(d.pos,d.size.x,d.size.y,d.size.z,ORANGE);
    }
    for(const auto& h:l.hazards){
        DrawTexturedBox(a.hazard,h.pos,h.size,WHITE,1.6f);
        DrawCubeWires(h.pos,h.size.x,h.size.y,h.size.z,RED);
    }
    for(const auto& p:l.pickups)if(!p.taken){
        Vector3 q=V(p.pos.x,p.pos.y+0.18f*sinf(float(GetTime())*2.6f+p.pos.x),p.pos.z);
        Color pc=p.kind==0?Color{80,220,255,255}:(p.kind==1?GOLD:MAGENTA);
        if(p.kind==0){DrawCrystal3D(q,0.34f,0.9f,float(GetTime())*0.9f,pc);DrawSphere(q,0.05f,Color{235,255,255,230});}
        else{DrawSphere(q,p.kind==1?0.34f:0.28f,p.kind==1?GOLD:MAGENTA);DrawSphereWires(q,p.kind==1?0.4f:0.34f,8,8,RAYWHITE);}
        DrawBrokenPieces(q,p.kind==0?1.0f:0.82f,float(p.order)*0.35f,pc);
        if(scan>0)DrawSphereWires(q,0.8f+0.2f*scan,8,8,pc);
    }
    for(const auto& sw:l.switches){
        Color c=sw.active?GREEN:ThemeColor(l.theme);
        if(a.terminalReady)DrawModelEx(a.terminalModel,sw.pos,V(0,1,0),0,V(0.9f,0.9f,0.9f),WHITE);
        else DrawCube(sw.pos,0.7f,1.0f,0.35f,Color{45,170,155,255});
        DrawCubeWires(sw.pos,0.74f,1.04f,0.38f,c);
    }
    for(const auto& d:l.drones){
        if(a.droneReady)DrawModelEx(a.drone,d.pos,V(0,1,0),float(GetTime())*35.0f,V(0.9f,0.9f,0.9f),WHITE);
        else DrawSphere(d.pos,0.55f,Color{220,65,95,255});
        DrawSphereWires(d.pos,0.72f,8,8,Color{255,80,110,180});
    }
    bool open=l.objective==Objective::SURVIVE||ObjectiveComplete(l,0,0,0);
    DrawCylinder(l.exit,1.5f,1.5f,0.14f,32,open?GREEN:Color{55,90,110,255});
    DrawCylinderWires(l.exit,1.7f,1.7f,0.18f,32,RAYWHITE);
    EndMode3D();
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
    InitWindow(startupTest?640:1440,startupTest?360:900,"NEO");
    if(!IsWindowReady()){if(startupTest)return 0;return 2;}
    EnableCursor();SetMouseCursor(MOUSE_CURSOR_DEFAULT);SetExitKey(KEY_NULL);SetTargetFPS(144);
    if(startupTest){
        BeginDrawing();ClearBackground(Color{3,8,13,255});DrawText("NEO STARTUP TEST",24,24,24,RAYWHITE);EndDrawing();CloseWindow();return 0;
    }
    if(!safeMode)InitAudioDevice();
    SaveData save=LoadGame();if(save.migrated)SaveGame(save);
    if(!safeMode&&save.settings.displayMode!=0)SetDisplayMode(save.settings,save.settings.displayMode);
    Assets assets=LoadAssets(safeMode);
    if(!safeMode&&assets.musicReady){SetSoundVolume(assets.theme,save.settings.music);PlaySound(assets.theme);}
    Screen screen=Screen::INTRO;
    Level level=BuildLevel(1);
    MouseState mouse{};
    Vector3 player=level.start,velocity{};
    float yaw=3.14159265359f,pitch=0,stamina=100,health=100,timeLeft=0,bobPhase=0,scanTimer=0,hintTimer=0,introElapsed=0;
    int collected=0,switchesActive=0,memoryStep=0,deaths=0,settingsRow=0;
    bool grounded=true,quit=false;
    Screen settingsReturn=Screen::MENU;
    float beatClock=0.0f;
    int beatStep=0;

    auto ClickSound=[&](){if(assets.soundsReady){SetSoundVolume(assets.click,save.settings.sfx);PlaySound(assets.click);}};
    auto StartLevel=[&](int id){
        level=BuildLevel(id);player=level.start;velocity={};yaw=3.14159265359f;pitch=0;stamina=100;health=100;
        timeLeft=level.timeLimit;collected=switchesActive=memoryStep=deaths=0;bobPhase=scanTimer=0;hintTimer=4;grounded=true;beatClock=0.0f;beatStep=0;
        screen=Screen::PLAYING;CaptureMouse(mouse);
    };
    auto ResumeLevel=[&](){
        screen=Screen::PLAYING;
        CaptureMouse(mouse);
    };
    auto Respawn=[&](){player=level.start;velocity={};health-=25;deaths++;timeLeft=std::max(0.0f,timeLeft-5);if(health<=0){health=0;screen=Screen::GAMEOVER;SaveGame(save);ReleaseMouse(mouse);}};

    while(!WindowShouldClose()&&!quit){
        float dt=std::min(GetFrameTime(),0.05f);
        if(!safeMode&&assets.musicReady&&screen!=Screen::INTRO&&!IsSoundPlaying(assets.theme)){
            SetSoundVolume(assets.theme,save.settings.music);
            PlaySound(assets.theme);
        }
        if(screen==Screen::PLAYING&&IsSoundValid(assets.beat)&&save.settings.music>0.01f){
            beatClock-=dt;
            if(beatClock<=0.0f){
                beatClock+=0.5f;
                beatStep=(beatStep+1)%8;
                SetSoundVolume(assets.beat,save.settings.music*(beatStep%4==0?0.18f:0.10f));
                PlaySound(assets.beat);
            }
        }
        if(screen!=Screen::PLAYING)EnsureUIMouse(mouse);
        else if(IsWindowFocused()){if(!mouse.captured)CaptureMouse(mouse);}else EnsureUIMouse(mouse);

        if(screen==Screen::INTRO){
            introElapsed+=dt;
            if(IsKeyPressed(KEY_ENTER)||IsKeyPressed(KEY_ESCAPE)||introElapsed>=INTRO_DURATION){screen=Screen::MENU;EnsureUIMouse(mouse);}
        }else if(screen==Screen::MENU){
            if(Button({GetScreenWidth()/2.0f-190,235,380,56})){StartLevel(1);ClickSound();}
            else if(Button({GetScreenWidth()/2.0f-190,301,380,56})){screen=Screen::LEVELS;ClickSound();}
            else if(Button({GetScreenWidth()/2.0f-190,367,380,56})){screen=Screen::SETTINGS;ClickSound();}
            else if(Button({GetScreenWidth()/2.0f-190,433,380,56})){screen=Screen::CREDITS;ClickSound();}
            else if(Button({GetScreenWidth()/2.0f-190,499,380,56}))quit=true;
        }else if(screen==Screen::LEVELS){
            if(IsKeyPressed(KEY_ESCAPE)){screen=Screen::MENU;}
            int cols=10,cellW=82,cellH=56,startX=(GetScreenWidth()-cols*cellW)/2,startY=170;
            for(int i=1;i<=LEVELS;i++){
                int col=(i-1)%cols,row=(i-1)/cols;
                Rectangle r={float(startX+col*cellW+4),float(startY+row*cellH+4),74,48};
                if(i<=save.unlocked&&Button(r)){StartLevel(i);ClickSound();break;}
            }
        }else if(screen==Screen::SETTINGS){
            if(IsKeyPressed(KEY_ESCAPE)){SaveGame(save);screen=settingsReturn;}
            if(IsKeyPressed(KEY_UP))settingsRow=(settingsRow+9)%10;
            if(IsKeyPressed(KEY_DOWN))settingsRow=(settingsRow+1)%10;
            if(IsMouseButtonPressed(MOUSE_BUTTON_LEFT)){
                int left=GetScreenWidth()/2-300;
                for(int i=0;i<10;i++){
                    Rectangle r={float(left),145+i*49,600,41};
                    if(CheckCollisionPointRec(GetMousePosition(),r)){
                        settingsRow=i;
                        bool rightSide=GetMousePosition().x>r.x+r.width*0.72f;
                        bool leftSide=GetMousePosition().x<r.x+r.width*0.28f;
                        int dir=rightSide?1:(leftSide?-1:0);
                        if(dir==0)dir=1;
                        switch(settingsRow){
                            case 0:save.settings.sensitivity=Clamp(save.settings.sensitivity+dir*0.0002f,0.0008f,0.008f);break;
                            case 1:save.settings.invertY=!save.settings.invertY;break;
                            case 2:save.settings.fov=Clamp(save.settings.fov+dir*5,60,105);break;
                            case 3:save.settings.hints=!save.settings.hints;break;
                            case 4:save.settings.shake=!save.settings.shake;break;
                            case 5:save.settings.sfx=Clamp(save.settings.sfx+dir*0.05f,0,1);break;
                            case 6:save.settings.music=Clamp(save.settings.music+dir*0.05f,0,1);if(assets.musicReady)SetSoundVolume(assets.theme,save.settings.music);break;
                            case 7:save.settings.crosshair=(save.settings.crosshair+dir+3)%3;break;
                            case 8:save.settings.displayMode=(save.settings.displayMode+dir+3)%3;SetDisplayMode(save.settings,save.settings.displayMode);break;
                            case 9:save.settings.performance=!save.settings.performance;break;
                        }
                        break;
                    }
                }
            }
            if(IsKeyPressed(KEY_LEFT)||IsKeyPressed(KEY_RIGHT)||IsKeyPressed(KEY_ENTER)){
                int dir=(IsKeyPressed(KEY_LEFT)?-1:1);
                switch(settingsRow){
                    case 0:save.settings.sensitivity=Clamp(save.settings.sensitivity+dir*0.0002f,0.0008f,0.008f);break;
                    case 1:save.settings.invertY=!save.settings.invertY;break;
                    case 2:save.settings.fov=Clamp(save.settings.fov+dir*5,60,105);break;
                    case 3:save.settings.hints=!save.settings.hints;break;
                    case 4:save.settings.shake=!save.settings.shake;break;
                    case 5:save.settings.sfx=Clamp(save.settings.sfx+dir*0.05f,0,1);break;
                    case 6:save.settings.music=Clamp(save.settings.music+dir*0.05f,0,1);break;
                    case 7:save.settings.crosshair=(save.settings.crosshair+dir+3)%3;break;
                    case 8:save.settings.displayMode=(save.settings.displayMode+dir+3)%3;SetDisplayMode(save.settings,save.settings.displayMode);break;
                    case 9:save.settings.performance=!save.settings.performance;break;
                }
            }
            if(Button({float(left),655,600,50})){SaveGame(save);screen=settingsReturn;ClickSound();}
        }else if(screen==Screen::CREDITS){
            if(IsKeyPressed(KEY_ESCAPE)||IsMouseButtonPressed(MOUSE_BUTTON_LEFT))screen=Screen::MENU;
        }else if(screen==Screen::PLAYING){
            if(IsKeyPressed(KEY_ESCAPE)){ReleaseMouse(mouse);screen=Screen::PAUSED;}
            if(IsWindowFocused()&&mouse.captured){
                Vector2 md=GetMouseDelta();
                if(mouse.ignoreNextDelta){md={0,0};mouse.ignoreNextDelta=false;}
                yaw-=md.x*save.settings.sensitivity;
                pitch+=(save.settings.invertY?md.y:-md.y)*save.settings.sensitivity;
                pitch=Clamp(pitch,-1.48f,1.48f);
            }
            Vector3 wish{};
            if(IsKeyDown(KEY_W))wish.z+=1;if(IsKeyDown(KEY_S))wish.z-=1;
            if(IsKeyDown(KEY_A))wish.x-=1;if(IsKeyDown(KEY_D))wish.x+=1;
            if(Vector3Length(wish)>0.01f)wish=Vector3Normalize(wish);
            Vector3 fwd=V(sinf(yaw),0,cosf(yaw)),right=V(-fwd.z,0,fwd.x);
            Vector3 move=Vector3Add(Vector3Scale(right,wish.x),Vector3Scale(fwd,wish.z));
            if(Vector3Length(move)>0.01f)move=Vector3Normalize(move);
            bool sprint=IsKeyDown(KEY_LEFT_SHIFT)&&stamina>1&&Vector3Length(move)>0.01f;
            float speed=sprint?8.2f:5.0f;stamina=sprint?std::max(0.0f,stamina-22*dt):std::min(100.0f,stamina+15*dt);
            Vector3 next=player;next.x+=move.x*speed*dt;bool block=false;
            for(const auto& w:level.walls)if(HitsBox(next,PLAYER_RADIUS,w.pos,w.size)){block=true;break;}
            for(const auto& d:level.doors)if(!d.open&&HitsBox(next,PLAYER_RADIUS,d.pos,d.size)){block=true;break;}
            if(!block)player.x=next.x;
            next=player;next.z+=move.z*speed*dt;block=false;
            for(const auto& w:level.walls)if(HitsBox(next,PLAYER_RADIUS,w.pos,w.size)){block=true;break;}
            for(const auto& d:level.doors)if(!d.open&&HitsBox(next,PLAYER_RADIUS,d.pos,d.size)){block=true;break;}
            if(!block)player.z=next.z;
            if(IsKeyPressed(KEY_SPACE)&&grounded){velocity.y=6.8f;grounded=false;}
            velocity.y-=18*dt;player.y+=velocity.y*dt;
            if(player.y<=PLAYER_HEIGHT*0.5f){player.y=PLAYER_HEIGHT*0.5f;velocity.y=0;grounded=true;}
            timeLeft-=dt;hintTimer=std::max(0.0f,hintTimer-dt);scanTimer=std::max(0.0f,scanTimer-dt);if(IsKeyPressed(KEY_Q))scanTimer=1.5f;
            if(Vector3Length(move)>0.01f)bobPhase+=dt*(sprint?14.0f:9.0f);else bobPhase+=dt*2.0f;
            for(auto& h:level.hazards){
                h.pos=V(h.base.x+sinf(float(GetTime())*1.8f+h.phase)*2.0f,h.base.y,h.base.z);
                if(HitsBox(player,PLAYER_RADIUS,h.pos,h.size)){Respawn();break;}
            }
            for(auto& d:level.drones){
                d.pos=V(d.base.x+sinf(float(GetTime())*0.9f+d.phase)*2.0f,d.base.y,d.base.z+cosf(float(GetTime())*0.7f+d.phase)*1.8f);
                if(Vector3Distance(player,d.pos)<1.25f){Respawn();break;}
            }
            if(IsKeyPressed(KEY_E)){
                float best=2.25f;int bs=-1,bp=-1;
                for(int i=0;i<(int)level.switches.size();i++){if(level.switches[i].active)continue;float d=Vector3Distance(player,level.switches[i].pos);if(d<best){best=d;bs=i;bp=-1;}}
                for(int i=0;i<(int)level.pickups.size();i++){if(level.pickups[i].taken)continue;float d=Vector3Distance(player,level.pickups[i].pos);if(d<best){best=d;bp=i;bs=-1;}}
                if(bs>=0){level.switches[bs].active=true;switchesActive++;ClickSound();}
                else if(bp>=0){
                    auto& p=level.pickups[bp];
                    if(p.kind==2){
                        if(p.order==memoryStep+1){p.taken=true;memoryStep++;if(assets.soundsReady){SetSoundVolume(assets.pickup,save.settings.sfx);PlaySound(assets.pickup);}}
                        else{memoryStep=0;timeLeft=std::max(0.0f,timeLeft-8);health=std::max(1.0f,health-10);hintTimer=4;if(assets.soundsReady){SetSoundVolume(assets.hit,save.settings.sfx);PlaySound(assets.hit);}}
                    }else{p.taken=true;if(p.kind==0)collected++;if(assets.soundsReady){SetSoundVolume(assets.pickup,save.settings.sfx);PlaySound(assets.pickup);}}
                }
            }
            bool done=ObjectiveComplete(level,collected,switchesActive,memoryStep);
            for(auto& d:level.doors){
                if(d.link==0){int keys=0;for(const auto& p:level.pickups)if(p.kind==1&&p.taken)keys++;d.open=keys>=level.required;}
                else if(d.link==1)d.open=done;
                else if(d.link==2)d.open=done;
                else if(d.link==3)d.open=done;
            }
            if((level.objective==Objective::SURVIVE||done)&&Vector3Distance(player,level.exit)<2.4f){
                float ratio=level.timeLimit>0?std::max(0.0f,timeLeft)/level.timeLimit:0;
                int stars=ratio>0.6f&&health>50?3:(ratio>0.2f?2:1);
                save.stars[level.id]=std::max(save.stars[level.id],stars);
                if(level.id<LEVELS)save.unlocked=std::max(save.unlocked,level.id+1);
                SaveGame(save);ReleaseMouse(mouse);
                screen=level.id==LEVELS?Screen::COMPLETE:Screen::LEVELS;
                if(level.id==LEVELS&&assets.soundsReady){SetSoundVolume(assets.complete,save.settings.sfx);PlaySound(assets.complete);}
            }
            if(screen==Screen::PLAYING&&level.objective!=Objective::SURVIVE&&timeLeft<=0){ReleaseMouse(mouse);screen=Screen::GAMEOVER;}
            if(level.objective==Objective::SURVIVE&&timeLeft<=0){save.unlocked=std::max(save.unlocked,level.id+1);save.stars[level.id]=3;SaveGame(save);ReleaseMouse(mouse);screen=level.id==LEVELS?Screen::COMPLETE:Screen::LEVELS;}
            ResolvePlayerSolids(level,player);
        }else if(screen==Screen::PAUSED){
            if(IsKeyPressed(KEY_ESCAPE)){ResumeLevel();}
            float cx=GetScreenWidth()/2.0f-190;
            if(Button({cx,330,380,56})){ResumeLevel();ClickSound();}
            else if(Button({cx,396,380,56})){settingsReturn=Screen::PAUSED;screen=Screen::SETTINGS;ClickSound();}
            else if(Button({cx,462,380,56})){screen=Screen::MENU;ClickSound();}
        }else if(screen==Screen::GAMEOVER){
            if(IsKeyPressed(KEY_R)||Button({GetScreenWidth()/2.0f-190,465,380,56}))StartLevel(level.id);
            if(IsKeyPressed(KEY_ESCAPE)||Button({GetScreenWidth()/2.0f-190,531,380,56}))screen=Screen::MENU;
        }else if(screen==Screen::COMPLETE){
            if(IsKeyPressed(KEY_ENTER)||Button({GetScreenWidth()/2.0f-190,490,380,56}))screen=Screen::LEVELS;
        }

        BeginDrawing();
        if(screen==Screen::INTRO)DrawIntro3D(introElapsed,assets);
        else if(screen==Screen::MENU)DrawMenu(save);
        else if(screen==Screen::LEVELS){
            ClearBackground(Color{4,8,13,255});CenterText("FLOOR SELECT",48,42,RAYWHITE);CenterText(TextFormat("%03d / %03d UNLOCKED",save.unlocked,LEVELS),98,16,SKYBLUE);
            int cols=10,cellW=82,cellH=56,startX=(GetScreenWidth()-cols*cellW)/2,startY=145;
            for(int i=1;i<=LEVELS;i++){int col=(i-1)%cols,row=(i-1)/cols;Rectangle r={float(startX+col*cellW+4),float(startY+row*cellH+4),74,48};bool u=i<=save.unlocked;ButtonDraw(r,TextFormat("%02d",i),u?ThemeColor((i-1)%10):Color{50,55,60,255});if(u&&save.stars[i])DrawText(TextFormat("★%d",save.stars[i]),int(r.x+45),int(r.y+29),10,GOLD);}
            DrawText("ESC — BACK",30,GetScreenHeight()-30,14,GRAY);
        }else if(screen==Screen::SETTINGS){
            ClearBackground(Color{4,8,13,255});CenterText("SETTINGS",45,40,RAYWHITE);CenterText("ARROWS / ENTER TO CHANGE • ESC TO SAVE",94,14,GRAY);
            const char* labels[10]={"MOUSE SENSITIVITY","INVERT Y","FIELD OF VIEW","HINTS","SCREEN SHAKE","SFX VOLUME","MUSIC VOLUME","CROSSHAIR","DISPLAY","PERFORMANCE"};
            std::string values[10]={TextFormat("%.4f",save.settings.sensitivity),save.settings.invertY?"ON":"OFF",TextFormat("%.0f",save.settings.fov),save.settings.hints?"ON":"OFF",save.settings.shake?"ON":"OFF",TextFormat("%d%%",int(save.settings.sfx*100)),TextFormat("%d%%",int(save.settings.music*100)),TextFormat("STYLE %d",save.settings.crosshair+1),save.settings.displayMode==0?"WINDOWED":save.settings.displayMode==1?"BORDERLESS":"FULLSCREEN",save.settings.performance?"ON":"OFF"};
            int left=GetScreenWidth()/2-300;
            for(int i=0;i<10;i++){
                Rectangle r={float(left),145+i*49,600,41};
                bool hover=CheckCollisionPointRec(GetMousePosition(),r);
                bool hot=i==settingsRow;
                Color fill=hover?Color{27,52,68,255}:(hot?Color{20,42,58,255}:Color{11,22,32,255});
                Color edge=hover?ThemeColor(i%10):(hot?SKYBLUE:Color{48,64,78,255});
                DrawRectangleRounded(r,0.08f,10,fill);
                DrawRectangleRoundedLines(r,0.08f,10,edge);
                DrawText(labels[i],int(r.x+18),int(r.y+12),15,RAYWHITE);
                DrawText(values[i].c_str(),int(r.x+395),int(r.y+12),15,SKYBLUE);
            }
            ButtonDraw({float(left),655,600,50},"BACK • SAVE",SKYBLUE);
        }else if(screen==Screen::CREDITS){
            ClearBackground(Color{4,8,13,255});CenterText("CREDITS",80,42,RAYWHITE);CenterText("GAME DESIGN / PROGRAMMING",180,18,SKYBLUE);CenterText("Tamasrazim",215,30,RAYWHITE);CenterText("Native Windows x64 • Raylib • deterministic 100-floor system",275,16,LIGHTGRAY);CenterText("Original instrumental soundtrack • procedural 3D cinematic",310,16,LIGHTGRAY);CenterText("CLICK OR ESC TO RETURN",500,14,GRAY);
        }else if(screen==Screen::PLAYING||screen==Screen::PAUSED){
            float bob=mouse.captured?sinf(bobPhase)*0.025f:0.0f;
            DrawWorld(level,assets,player,yaw,pitch,bob,save.settings,scanTimer);
            DrawRectangle(24,24,392,108,Color{5,13,22,225});DrawText(TextFormat("FLOOR %03d • %s",level.id,level.title.c_str()),42,43,18,RAYWHITE);DrawText(ObjectiveName(level.objective),42,69,13,ThemeColor(level.theme));
            const char* obj="";int keys=0;for(const auto& p:level.pickups)if(p.kind==1&&p.taken)keys++;
            if(level.objective==Objective::COLLECT)obj=TextFormat("CRYSTALS %d / %d",collected,level.required);
            else if(level.objective==Objective::SWITCHES)obj=TextFormat("SWITCHES %d / %d",switchesActive,level.required);
            else if(level.objective==Objective::KEYCARD)obj=TextFormat("KEYCARDS %d / %d",keys,level.required);
            else if(level.objective==Objective::MEMORY)obj=TextFormat("MEMORY %d / %d",memoryStep,level.required);
            else if(level.objective==Objective::COMBO)obj=TextFormat("C%d/3  S%d/3  K%d/1  M%d/4",collected,switchesActive,keys,memoryStep);
            else obj=TextFormat("SURVIVE %.0fs",std::max(0.0f,timeLeft));
            DrawText(obj,42,92,14,RAYWHITE);
            DrawText(TextFormat("HP %03d",int(health)),24,GetScreenHeight()-82,16,health>50?GREEN:ORANGE);DrawRectangle(24,GetScreenHeight()-58,180,9,Color{18,24,32,255});DrawRectangle(24,GetScreenHeight()-58,int(180*health/100),9,RED);DrawText(TextFormat("STAMINA %03d",int(stamina)),224,GetScreenHeight()-62,14,SKYBLUE);
            if(save.settings.hints&&mouse.captured)CenterText("ESC — PAUSE / RELEASE MOUSE",GetScreenHeight()-28,12,GRAY);
            if(save.settings.hints&&mouse.captured){float nearest=2.25f;for(const auto& sw:level.switches)if(!sw.active)nearest=std::min(nearest,Vector3Distance(player,sw.pos));for(const auto& p:level.pickups)if(!p.taken)nearest=std::min(nearest,Vector3Distance(player,p.pos));if(nearest<2.25f)CenterText("E — INTERACT",GetScreenHeight()/2+35,15,SKYBLUE);}
            if(mouse.captured)Crosshair(save.settings.crosshair);
            if(save.settings.performance){DrawRectangle(GetScreenWidth()-220,24,196,92,Color{5,13,22,225});DrawText(TextFormat("FPS %d",GetFPS()),GetScreenWidth()-204,40,13,RAYWHITE);DrawText(TextFormat("FRAME %.2f ms",GetFrameTime()*1000),GetScreenWidth()-204,60,13,RAYWHITE);int v=QueryDedicatedVRAMMB();DrawText(v?TextFormat("VRAM %d MB",v):"VRAM N/A",GetScreenWidth()-204,80,13,RAYWHITE);}
            if(screen==Screen::PAUSED){DrawRectangle(0,0,GetScreenWidth(),GetScreenHeight(),Color{0,5,10,165});CenterText("PAUSED",185,48,RAYWHITE);CenterText("MOUSE RELEASED",240,16,LIGHTGRAY);ButtonDraw({GetScreenWidth()/2.0f-190,330,380,56},"RESUME • CAPTURE MOUSE",SKYBLUE);ButtonDraw({GetScreenWidth()/2.0f-190,396,380,56},"SETTINGS",ThemeColor(2));ButtonDraw({GetScreenWidth()/2.0f-190,462,380,56},"MAIN MENU",Color{230,90,120,255});}
        }else if(screen==Screen::GAMEOVER){ClearBackground(Color{20,6,10,255});CenterText("SYSTEM FAILURE",155,56,RED);CenterText(TextFormat("FLOOR %03d",level.id),230,22,RAYWHITE);CenterText("THE VAULT TIMER EXPIRED",270,17,LIGHTGRAY);ButtonDraw({GetScreenWidth()/2.0f-190,465,380,56},"RETRY FLOOR • R",ORANGE);ButtonDraw({GetScreenWidth()/2.0f-190,531,380,56},"MAIN MENU • ESC",Color{230,90,120,255});}
        else if(screen==Screen::COMPLETE){ClearBackground(Color{5,14,18,255});CenterText("VAULT MASTER",160,58,GREEN);CenterText("ALL 100 FLOORS COMPLETE",235,24,RAYWHITE);int total=0;for(int i=1;i<=LEVELS;i++)total+=save.stars[i];CenterText(TextFormat("TOTAL STARS %d / %d",total,LEVELS*3),275,18,GOLD);ButtonDraw({GetScreenWidth()/2.0f-190,490,380,56},"RETURN TO FLOOR SELECT",GREEN);}
        EndDrawing();
    }
    SaveGame(save);UnloadAssets(assets);if(IsAudioDeviceReady())CloseAudioDevice();EnableCursor();CloseWindow();return 0;
}

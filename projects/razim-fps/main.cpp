#include "raylib.h"
#include "raymath.h"
#include "rlgl.h"
#include <algorithm>
#include <array>
#include <cmath>
#include <cstdint>
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
constexpr int TEXTURES=28;
constexpr float WORLD=29.0f;
constexpr float PLAYER_R=0.34f;
constexpr float EYE_Y=1.52f;
constexpr float TAU=6.28318530718f;

enum class Screen{INTRO,MENU,LEVELS,SETTINGS,CREDITS,PLAYING,PAUSED,GAMEOVER,COMPLETE};
enum class Objective{COLLECT,SWITCHES,KEYCARD,MEMORY,SURVIVE,COMBO};

struct Settings{float sens=0.0026f;bool invertY=false;float fov=74;bool hints=true;bool shake=true;int crosshair=0;bool perf=false;int display=0;};
struct Save{int version=4;int unlocked=1;std::array<int,LEVELS+1> stars{};Settings settings{};};
struct SwitchNode{Vector3 p{};bool active=false;};
struct Wall{Vector3 p{},s{};int mat=0;};
struct Pickup{Vector3 p{};int kind=0;int order=0;bool taken=false;float burst=0.0f;};
struct Hazard{Vector3 p{},base{};float phase=0;float speed=1;};
struct Level{
    int id=1,tier=0,theme=0,required=1;
    Objective objective=Objective::COLLECT;
    float timeLimit=240;
    std::string title;
    std::vector<Wall> walls;
    std::vector<Pickup> pickups;
    std::vector<SwitchNode> switches;
    std::vector<Hazard> hazards;
    Vector3 start{0,0.9f,24},exit{0,0.12f,-25};
};
struct Assets{
    std::array<Texture2D,TEXTURES> tex{};
    Sound music{},beat{},pickup{},hit{},click{},complete{};
};
struct Particle{
    Vector3 p{},v{};
    Color c{255,255,255,255};
    float life=0,maxLife=0,size=0.05f;
};
std::vector<Particle> gParticles;
Sound MakeBeatSound();

Vector3 V(float x,float y,float z){return{x,y,z};}
float Ease(float t){t=Clamp(t,0.0f,1.0f);return t*t*(3.0f-2.0f*t);}
Color Theme(int t){
    static const Color c[10]={{55,210,255,255},{110,130,255,255},{50,235,170,255},{255,190,70,255},{255,80,145,255},
                              {185,105,255,255},{65,235,230,255},{255,105,65,255},{135,225,90,255},{225,225,255,255}};
    return c[t%10];
}
const char* ObjName(Objective o){
    switch(o){
        case Objective::COLLECT:return "CRYSTAL RECOVERY";
        case Objective::SWITCHES:return "POWER RESTORE";
        case Objective::KEYCARD:return "KEYCARD BREACH";
        case Objective::MEMORY:return "MEMORY SEQUENCE";
        case Objective::SURVIVE:return "SURVIVAL RUN";
        default:return "VAULT SEQUENCE";
    }
}
std::string SavePath(){
#if defined(_WIN32)
    const char* p=std::getenv("LOCALAPPDATA");
    if(p&&*p){std::filesystem::path d=std::filesystem::path(p)/"Tamasrazim";std::error_code ec;std::filesystem::create_directories(d,ec);return(d/"NeonVault.cfg").string();}
#endif
    return "NeonVault.cfg";
}
Save LoadSave(){
    Save s;std::ifstream in(SavePath());if(!in)return s;std::string k;
    while(in>>k){
        if(k=="version")in>>s.version;else if(k=="unlocked")in>>s.unlocked;
        else if(k=="sens")in>>s.settings.sens;else if(k=="invertY"){int v;in>>v;s.settings.invertY=v!=0;}
        else if(k=="fov")in>>s.settings.fov;else if(k=="hints"){int v;in>>v;s.settings.hints=v!=0;}
        else if(k=="shake"){int v;in>>v;s.settings.shake=v!=0;}else if(k=="crosshair")in>>s.settings.crosshair;
        else if(k=="perf"){int v;in>>v;s.settings.perf=v!=0;}else if(k=="display")in>>s.settings.display;else if(k=="star"){int id,v;in>>id>>v;if(id>=1&&id<=LEVELS)s.stars[id]=std::clamp(v,0,3);}
    }
    if(s.version!=4)s=Save{};
    s.unlocked=std::clamp(s.unlocked,1,LEVELS);s.settings.sens=Clamp(s.settings.sens,0.0007f,0.006f);s.settings.fov=Clamp(s.settings.fov,60,105);
    s.settings.crosshair=std::clamp(s.settings.crosshair,0,2);s.settings.display=std::clamp(s.settings.display,0,2);return s;
}
void SaveGame(const Save& s){
    std::ofstream o(SavePath(),std::ios::trunc);if(!o)return;
    o<<"version 4\n"<<"unlocked "<<s.unlocked<<"\n"<<"sens "<<s.settings.sens<<"\n"<<"invertY "<<(s.settings.invertY?1:0)<<"\n";
    o<<"fov "<<s.settings.fov<<"\n"<<"hints "<<(s.settings.hints?1:0)<<"\n"<<"shake "<<(s.settings.shake?1:0)<<"\n";
    o<<"crosshair "<<s.settings.crosshair<<"\n"<<"perf "<<(s.settings.perf?1:0)<<"\n"<<"display "<<s.settings.display<<"\n";for(int i=1;i<=LEVELS;i++)o<<"star "<<i<<" "<<s.stars[i]<<"\n";
}
bool HitBox(Vector3 p,float r,Vector3 c,Vector3 s){
    Vector3 h=Vector3Scale(s,0.5f);float x=Clamp(p.x,c.x-h.x,c.x+h.x),z=Clamp(p.z,c.z-h.z,c.z+h.z);float dx=p.x-x,dz=p.z-z;return dx*dx+dz*dz<r*r;
}
bool Overlap(Vector3 a,Vector3 as,Vector3 b,Vector3 bs,float gap=0){
    return fabsf(a.x-b.x)<(as.x+bs.x)*0.5f+gap&&fabsf(a.z-b.z)<(as.z+bs.z)*0.5f+gap;
}
bool Clear(const Level& l,Vector3 p,float r){
    if(fabsf(p.x)>WORLD-r||fabsf(p.z)>WORLD-r)return false;
    for(const auto& w:l.walls)if(HitBox(p,r,w.p,w.s))return false;return true;
}
Vector3 Safe(const Level& l,Vector3 p,float r,int salt){
    if(Clear(l,p,r))return p;
    for(int n=1;n<24;n++)for(int i=0;i<32;i++){float a=TAU*i/32.0f+salt*0.17f;Vector3 q=V(p.x+cosf(a)*n,p.y,p.z+sinf(a)*n);if(Clear(l,q,r))return q;}
    for(int z=-24;z<=24;z+=2)for(int x=-24;x<=24;x+=2){Vector3 q=V(float(x),p.y,float(z));if(Clear(l,q,r)&&Vector3Distance(q,l.start)>4.0f)return q;}
    return V(0,p.y,24);
}
uint32_t Mix(uint32_t x){x^=x>>16;x*=0x7feb352du;x^=x>>15;x*=0x846ca68bu;x^=x>>16;return x;}
Level BuildLevel(int id){
    Level l;l.id=std::clamp(id,1,LEVELS);l.tier=(l.id-1)/10;l.theme=(l.id-1)%10;l.objective=Objective((l.id-1)%6);
    const char* names[10]={"FIRST CONTACT","REACTOR RING","SPLIT GRID","PRESSURE DECK","ARCHIVE WING","MIRROR LAB","CONVEYOR VAULT","BLACKOUT ZONE","CORE APPROACH","THE INNER VAULT"};
    l.title=(l.id==100)?"THE VAULT CORE":names[l.tier];l.timeLimit=235+l.tier*24+(l.objective==Objective::SURVIVE?70:0);
    l.walls={{V(0,1,-29),V(58,2,1),0},{V(0,1,29),V(58,2,1),0},{V(-29,1,0),V(1,2,58),0},{V(29,1,0),V(1,2,58),0}};
    uint32_t seed=Mix(uint32_t(l.id)*0x9e3779b9u);auto rnd=[&](){seed^=seed<<13;seed^=seed>>17;seed^=seed<<5;return float(seed&0xffffffu)/16777215.0f;};
    int side=5+l.tier*2;
    for(int i=0;i<side;i++){
        int sideSign=(i&1)?1:-1;float x=sideSign*(9+rnd()*13),z=-20+rnd()*42;
        Vector3 sz=V(1.0f+rnd()*1.8f,1.0f+rnd()*2.0f,2.0f+rnd()*3.5f);
        Vector3 p=Safe(l,V(x,sz.y*0.5f,z),0.72f,100+i);
        if(fabsf(p.x)<6.0f)continue;
        bool bad=false;for(const auto& w:l.walls)if(Overlap(p,sz,w.p,w.s,0.25f)){bad=true;break;}if(!bad)l.walls.push_back({p,sz,1});
    }
    std::array<float,8> zs={17,12,7,2,-3,-8,-13,-18};
    switch(l.objective){
        case Objective::COLLECT:l.required=3+l.tier%3;for(int i=0;i<l.required;i++)l.pickups.push_back({Safe(l,V((i&1)?2.6f:-2.6f,0.8f,zs[i%8]),0.5f,10+i),0,0,false});break;
        case Objective::SWITCHES:l.required=std::min(7,3+l.tier/2);for(int i=0;i<l.required;i++)l.switches.push_back({Safe(l,V((i&1)?2.4f:-2.4f,0.9f,zs[i%8]),0.65f,40+i),false});break;
        case Objective::KEYCARD:l.required=1+l.tier/3;for(int i=0;i<l.required;i++)l.pickups.push_back({Safe(l,V((i%3-1)*1.7f,0.8f,zs[i%8]),0.5f,70+i),1,0,false});break;
        case Objective::MEMORY:l.required=std::min(9,4+l.tier);for(int i=0;i<l.required;i++)l.pickups.push_back({Safe(l,V((i%3-1)*2.5f,0.72f,zs[i%8]),0.5f,100+i),2,i+1,false});break;
        case Objective::COMBO:{
            l.required=4;
            for(int i=0;i<3;i++)l.pickups.push_back({Safe(l,V((i-1)*2.6f,0.8f,zs[i]),0.5f,130+i),0,0,false});
            for(int i=0;i<3;i++)l.switches.push_back({Safe(l,V((i-1)*2.5f,0.9f,zs[i+3]),0.65f,150+i),false});
            l.pickups.push_back({Safe(l,V(0,0.8f,zs[6]),0.5f,170),1,0,false});
            const std::array<Vector3,4> memPos={V(-2.8f,0.72f,-13),V(2.8f,0.72f,-13),V(-2.8f,0.72f,-19),V(2.8f,0.72f,-19)};
            for(int i=0;i<4;i++)l.pickups.push_back({Safe(l,memPos[i],0.5f,180+i),2,i+1,false});
            break;
        }
        case Objective::SURVIVE:l.required=0;break;
    }
    int hz=std::max(2,1+l.tier/2);
    for(int i=0;i<hz;i++){
        Vector3 p{};
        bool placed=false;
        for(int attempt=0;attempt<48&&!placed;attempt++){
            int sg=((i+attempt)&1)?1:-1;
            float x=sg*(10+rnd()*14),z=-16+rnd()*30;
            p=Safe(l,V(x,0.55f,z),0.75f,300+i*53+attempt);
            bool bad=Vector3Distance(p,l.start)<5.0f||Vector3Distance(p,l.exit)<4.0f;
            for(const auto& q:l.pickups)if(Vector3Distance(p,q.p)<2.4f)bad=true;
            for(const auto& q:l.switches)if(Vector3Distance(p,q.p)<2.4f)bad=true;
            for(const auto& q:l.hazards)if(Vector3Distance(p,q.base)<2.8f)bad=true;
            if(!bad)placed=true;
        }
        if(!placed)p=V(((i&1)?1.0f:-1.0f)*15.0f,0.55f,0.0f);
        l.hazards.push_back({p,p,rnd()*TAU,1.0f+0.04f*l.tier});
    }
    return l;
}
bool Reachable(const Level& l,Vector3 target){
    constexpr int N=58;auto cell=[](Vector3 p){return std::pair<int,int>{std::clamp(int(p.x+WORLD),0,N-1),std::clamp(int(p.z+WORLD),0,N-1)};};
    auto blocked=[&](Vector3 p){if(fabsf(p.x)>WORLD-PLAYER_R||fabsf(p.z)>WORLD-PLAYER_R)return true;for(const auto&w:l.walls)if(HitBox(p,PLAYER_R*1.1f,w.p,w.s))return true;return false;};
    auto [sx,sz]=cell(l.start);auto [gx,gz]=cell(target);if(blocked(V(-WORLD+sx+0.5f,0.9f,-WORLD+sz+0.5f))||blocked(V(-WORLD+gx+0.5f,0.9f,-WORLD+gz+0.5f)))return false;
    std::queue<std::pair<int,int>>q;bool seen[N][N]{};q.push({sx,sz});seen[sx][sz]=true;const int dx[4]={1,-1,0,0},dz[4]={0,0,1,-1};
    while(!q.empty()){auto[x,z]=q.front();q.pop();if(x==gx&&z==gz)return true;for(int d=0;d<4;d++){int nx=x+dx[d],nz=z+dz[d];if(nx<0||nz<0||nx>=N||nz>=N||seen[nx][nz])continue;Vector3 p=V(-WORLD+nx+0.5f,0.9f,-WORLD+nz+0.5f);if(blocked(p))continue;seen[nx][nz]=true;q.push({nx,nz});}}return false;
}
bool Valid(const Level& l){
    for(size_t i=0;i<l.walls.size();i++)for(size_t j=i+1;j<l.walls.size();j++)if(Overlap(l.walls[i].p,l.walls[i].s,l.walls[j].p,l.walls[j].s,-0.02f))return false;
    if(!Reachable(l,l.exit))return false;for(const auto&p:l.pickups)if(!Reachable(l,p.p))return false;for(const auto&p:l.switches)if(!Reachable(l,p.p))return false;return true;
}
void Repair(Level& l){while(!Valid(l)&&l.walls.size()>4)l.walls.pop_back();}
Texture2D LoadTex(const std::string& f,Color fallback){
    if(FileExists(f.c_str())){Texture2D t=LoadTexture(f.c_str());if(t.id){GenTextureMipmaps(&t);SetTextureFilter(t,TEXTURE_FILTER_TRILINEAR);SetTextureWrap(t,TEXTURE_WRAP_REPEAT);return t;}}
    Image im=GenImageColor(64,64,fallback);Texture2D t=LoadTextureFromImage(im);UnloadImage(im);if(t.id){GenTextureMipmaps(&t);SetTextureFilter(t,TEXTURE_FILTER_TRILINEAR);SetTextureWrap(t,TEXTURE_WRAP_REPEAT);}return t;
}
Assets LoadAssets(bool safe){
    Assets a{};
    for(int i=0;i<TEXTURES;i++){char p[128];std::snprintf(p,sizeof(p),"assets/textures/vault_%02d.bmp",i+1);a.tex[i]=LoadTex(p,Theme(i%10));}
    if(!safe&&IsAudioDeviceReady()){
        a.music=LoadSound("assets/audio/neon-vault-theme.wav");
        if(FileExists("assets/audio/vault-beats.wav"))a.beat=LoadSound("assets/audio/vault-beats.wav");
        if(!IsSoundValid(a.beat))a.beat=MakeBeatSound();
        a.pickup=LoadSound("assets/audio/pickup.wav");a.hit=LoadSound("assets/audio/hit.wav");
        a.click=LoadSound("assets/audio/click.wav");a.complete=LoadSound("assets/audio/complete.wav");
    } return a;
}
Sound MakeBeatSound(){
    constexpr unsigned int sr=22050,seconds=4,channels=1;
    const unsigned int frames=sr*seconds;
    short* data=(short*)std::malloc(size_t(frames)*sizeof(short));
    if(!data)return Sound{};
    for(unsigned int i=0;i<frames;i++){
        float t=float(i)/float(sr),v=0.0f;
        int step=int(floorf(t*4.0f));
        float beatPos=fmodf(t,0.25f);
        float kickPhase=fmodf(t,0.5f);
        bool kickOn=(step%8==0)||(step%8==3)||(step%8==4)||(step%8==6);
        if(kickOn&&kickPhase<0.15f){float e=expf(-22.0f*kickPhase);float f=82.0f-48.0f*(kickPhase/0.15f);v+=0.66f*e*sinf(TAU*f*kickPhase);}
        float sn=fmodf(t,1.0f);
        if((sn>=0.5f&&sn<0.61f)||(sn>=0.99f)){float q=(sn>=0.99f?sn-0.99f:sn-0.5f),e=expf(-34.0f*q);v+=0.13f*e*(sinf(TAU*2100.0f*q)+0.42f*sinf(TAU*3350.0f*q));}
        if(beatPos<0.028f){float e=expf(-95.0f*beatPos);v+=0.038f*e*sinf(TAU*6200.0f*beatPos);}
        float off=fmodf(t+0.125f,0.25f);if(off<0.022f){float e=expf(-110.0f*off);v+=0.022f*e*sinf(TAU*7600.0f*off);}
        int halfStep=int(floorf(t*8.0f));float tomPos=fmodf(t,0.5f);
        if((halfStep%8==2)||(halfStep%8==7)){if(tomPos<0.16f){float e=expf(-20.0f*tomPos);float f=145.0f-70.0f*(tomPos/0.16f);v+=0.075f*e*sinf(TAU*f*tomPos);}}
        float rimPos=fmodf(t+0.0625f,0.25f);if(rimPos<0.012f){float e=expf(-150.0f*rimPos);v+=0.018f*e*sinf(TAU*9200.0f*rimPos);}
        float bass=fmodf(t,1.0f);
        if(bass<0.32f){float e=expf(-8.5f*bass);float note=(int(t)%2==0)?55.0f:61.735f;v+=0.045f*e*sinf(TAU*note*bass);}
        data[i]=(short)(Clamp(v,-0.9f,0.9f)*32767.0f);
    }
    Wave w{};w.frameCount=frames;w.sampleRate=sr;w.sampleSize=16;w.channels=channels;w.data=data;
    Sound out=LoadSoundFromWave(w);UnloadWave(w);return out;
}
void UnloadAssets(Assets&a){for(auto&t:a.tex)if(t.id)UnloadTexture(t);if(IsSoundValid(a.music))UnloadSound(a.music);if(IsSoundValid(a.beat))UnloadSound(a.beat);if(IsSoundValid(a.pickup))UnloadSound(a.pickup);if(IsSoundValid(a.hit))UnloadSound(a.hit);if(IsSoundValid(a.click))UnloadSound(a.click);if(IsSoundValid(a.complete))UnloadSound(a.complete);}
bool Btn(Rectangle r){return CheckCollisionPointRec(GetMousePosition(),r)&&IsMouseButtonPressed(MOUSE_BUTTON_LEFT);}
void BtnDrawEx(Rectangle r,const char*s,Color accent,bool selected=false){

    bool h=CheckCollisionPointRec(GetMousePosition(),r);
    bool active=h||selected;
    bool down=h&&IsMouseButtonDown(MOUSE_BUTTON_LEFT);
    float pulse=active?0.035f*(0.5f+0.5f*sinf(float(GetTime())*8.0f)):0.0f;
    float press=down?3.0f:0.0f;
    Rectangle rr={r.x-r.width*pulse*0.5f,r.y-r.height*pulse*0.5f+press,r.width*(1.0f+pulse),r.height*(1.0f+pulse)};
    DrawRectangleRounded(rr,.08f,8,down?Color{28,64,82,255}:(active?Color{22,48,64,255}:Color{9,18,28,255}));
    DrawRectangleRoundedLines(rr,.08f,8,down?RAYWHITE:(active?accent:Color{45,62,78,255}));
    if(active)DrawRectangleRoundedLines({rr.x+2,rr.y+2,rr.width-4,rr.height-4},.08f,8,Color{accent.r,accent.g,accent.b,110});

    int fs=18;DrawText(s,int(rr.x+(rr.width-MeasureText(s,fs))*.5f),int(rr.y+(rr.height-fs)*0.5f),fs,RAYWHITE);
}
void BtnDraw(Rectangle r,const char*s,Color accent){BtnDrawEx(r,s,accent,false);}
void UIVertical(int count,int&focus){
    if(count<=0)return;
    if(IsKeyPressed(KEY_UP))focus=(focus+count-1)%count;
    if(IsKeyPressed(KEY_DOWN)||IsKeyPressed(KEY_TAB))focus=(focus+1)%count;
    if(IsKeyPressed(KEY_HOME))focus=0;
    if(IsKeyPressed(KEY_END))focus=count-1;
}
bool UIActivate(int focus,int index,Rectangle r){
    return Btn(r)||(IsKeyPressed(KEY_ENTER)&&focus==index)||(IsKeyPressed(KEY_SPACE)&&focus==index);
}
void Center(const char*s,int y,int fs,Color c){DrawText(s,(GetScreenWidth()-MeasureText(s,fs))/2,y,fs,c);}
void Cross(int style){int x=GetScreenWidth()/2,y=GetScreenHeight()/2;if(style==0){DrawLine(x-9,y,x-3,y,RAYWHITE);DrawLine(x+3,y,x+9,y,RAYWHITE);DrawLine(x,y-9,x,y-3,RAYWHITE);DrawLine(x,y+3,x,y+9,RAYWHITE);}else if(style==1){DrawCircleLines(x,y,7,RAYWHITE);DrawCircle(x,y,2,RAYWHITE);}else DrawCircle(x,y,3,RAYWHITE);}
void Box(Texture2D t,Vector3 p,Vector3 s,Color c){
    if(!t.id){DrawCube(p,s.x,s.y,s.z,c);return;}
    float hx=s.x*.5f,hy=s.y*.5f,hz=s.z*.5f;
    float x0=p.x-hx,x1=p.x+hx,y0=p.y-hy,y1=p.y+hy,z0=p.z-hz,z1=p.z+hz;
    rlSetTexture(t.id);rlBegin(RL_QUADS);rlColor4ub(c.r,c.g,c.b,c.a);
    rlNormal3f(0,0,1);rlTexCoord2f(0,0);rlVertex3f(x0,y0,z1);rlTexCoord2f(1,0);rlVertex3f(x1,y0,z1);rlTexCoord2f(1,1);rlVertex3f(x1,y1,z1);rlTexCoord2f(0,1);rlVertex3f(x0,y1,z1);
    rlNormal3f(0,0,-1);rlTexCoord2f(0,0);rlVertex3f(x1,y0,z0);rlTexCoord2f(1,0);rlVertex3f(x0,y0,z0);rlTexCoord2f(1,1);rlVertex3f(x0,y1,z0);rlTexCoord2f(0,1);rlVertex3f(x1,y1,z0);
    rlNormal3f(-1,0,0);rlTexCoord2f(0,0);rlVertex3f(x0,y0,z0);rlTexCoord2f(1,0);rlVertex3f(x0,y0,z1);rlTexCoord2f(1,1);rlVertex3f(x0,y1,z1);rlTexCoord2f(0,1);rlVertex3f(x0,y1,z0);
    rlNormal3f(1,0,0);rlTexCoord2f(0,0);rlVertex3f(x1,y0,z1);rlTexCoord2f(1,0);rlVertex3f(x1,y0,z0);rlTexCoord2f(1,1);rlVertex3f(x1,y1,z0);rlTexCoord2f(0,1);rlVertex3f(x1,y1,z1);
    rlNormal3f(0,1,0);rlTexCoord2f(0,0);rlVertex3f(x0,y1,z1);rlTexCoord2f(1,0);rlVertex3f(x1,y1,z1);rlTexCoord2f(1,1);rlVertex3f(x1,y1,z0);rlTexCoord2f(0,1);rlVertex3f(x0,y1,z0);
    rlNormal3f(0,-1,0);rlTexCoord2f(0,0);rlVertex3f(x0,y0,z0);rlTexCoord2f(1,0);rlVertex3f(x1,y0,z0);rlTexCoord2f(1,1);rlVertex3f(x1,y0,z1);rlTexCoord2f(0,1);rlVertex3f(x0,y0,z1);
    rlEnd();rlSetTexture(0);
}
void DrawBrokenPiece(Vector3 c,float r,int count,float time,Color color){
    float fracture=0.76f+0.24f*sinf(time*1.4f);
    float pulse=0.82f+0.18f*sinf(time*2.3f);
    for(int i=0;i<count;i++){
        float a=TAU*float(i)/float(count)+time*(0.20f+0.045f*i);
        float phase=time*1.85f+i*1.31f;
        float crack=0.82f+0.22f*sinf(phase*1.65f);
        float shatter=0.52f+0.48f*fracture;
        float radial=r*(0.28f+0.68f*shatter)*(0.92f+0.08f*sinf(phase));
        float lift=0.10f*sinf(time*2.9f+i*1.7f)+0.06f*sinf(time*5.2f+i*2.1f);
        Vector3 q=V(c.x+cosf(a)*radial,c.y+lift,c.z+sinf(a)*radial);
        Vector3 dir=Vector3Normalize(V(cosf(a)*(0.36f+0.22f*sinf(phase)),0.62f+0.25f*cosf(phase),sinf(a)*(0.36f+0.22f*sinf(phase))));
        Vector3 tip=Vector3Add(q,Vector3Scale(dir,r*(0.44f+0.30f*crack)));
        Vector3 tangent=Vector3Normalize(V(-dir.z,0.0f,dir.x));
        Vector3 side=Vector3Normalize(Vector3CrossProduct(dir,tangent));
        float w=r*(0.10f+0.035f*(0.5f+0.5f*sinf(phase)));
        Vector3 v1=Vector3Add(q,Vector3Scale(tangent,w));
        Vector3 v2=Vector3Add(q,Vector3Scale(tangent,-w));
        Vector3 v3=Vector3Add(q,Vector3Scale(side,w*0.72f));
        Color c1=color;
        Color c2=Color{(unsigned char)std::min(255,int(color.r)+35),(unsigned char)std::min(255,int(color.g)+35),(unsigned char)std::min(255,int(color.b)+35),color.a};
        rlBegin(RL_TRIANGLES);
        rlColor4ub(c1.r,c1.g,c1.b,c1.a);rlVertex3f(v1.x,v1.y,v1.z);rlVertex3f(v2.x,v2.y,v2.z);rlVertex3f(tip.x,tip.y,tip.z);
        rlColor4ub(c2.r,c2.g,c2.b,c2.a);rlVertex3f(v2.x,v2.y,v2.z);rlVertex3f(v3.x,v3.y,v3.z);rlVertex3f(tip.x,tip.y,tip.z);
        rlColor4ub(c1.r,c1.g,c1.b,c1.a);rlVertex3f(v3.x,v3.y,v3.z);rlVertex3f(v1.x,v1.y,v1.z);rlVertex3f(tip.x,tip.y,tip.z);
        rlEnd();
        DrawSphere(q,w*0.45f,Color{color.r,color.g,color.b,110});
    }
    DrawSphere(c,r*0.075f*pulse,Color{235,255,255,165});
}
void Burst(Vector3 center,Color color,int count,float impulse){
    if((int)gParticles.size()>420)gParticles.erase(gParticles.begin(),gParticles.begin()+std::min<size_t>(120,gParticles.size()));
    for(int i=0;i<count;i++){
        float a=TAU*float(i)/float(std::max(1,count))+float(GetTime())*0.17f;
        float ring=0.35f+0.85f*(float((i*37)%100)/100.0f);
        Vector3 dir=Vector3Normalize(V(cosf(a)*ring,0.32f+0.85f*(float((i*19)%100)/100.0f),sinf(a)*ring));
        Particle p;
        p.p=center;
        p.v=Vector3Scale(dir,impulse*(0.55f+0.65f*float((i*23)%100)/100.0f));
        p.c=Color{color.r,color.g,color.b,235};
        p.life=p.maxLife=0.30f+0.48f*float((i*31)%100)/100.0f;
        p.size=0.018f+0.035f*float((i*17)%100)/100.0f;
        gParticles.push_back(p);
    }
}
void UpdateParticles(float dt){
    for(auto& p:gParticles){
        p.v.y-=6.5f*dt;
        p.p=Vector3Add(p.p,Vector3Scale(p.v,dt));
        p.v=Vector3Scale(p.v,0.985f);
        p.life-=dt;
        float a=Clamp(p.life/std::max(0.01f,p.maxLife),0.0f,1.0f);
        p.c.a=(unsigned char)(235.0f*a);
    }
    gParticles.erase(std::remove_if(gParticles.begin(),gParticles.end(),[](const Particle&p){return p.life<=0.0f;}),gParticles.end());
}
void DrawParticles(){
    for(const auto& p:gParticles)DrawSphere(p.p,p.size,p.c);
}
bool ObjectiveDone(const Level&l,int got,int sw,int mem){if(l.objective==Objective::COLLECT)return got>=l.required;if(l.objective==Objective::SWITCHES)return sw>=l.required;if(l.objective==Objective::KEYCARD){int n=0;for(const auto&p:l.pickups)if(p.kind==1&&p.taken)n++;return n>=l.required;}if(l.objective==Objective::MEMORY)return mem>=l.required;if(l.objective==Objective::COMBO){int k=0;for(const auto&p:l.pickups)if(p.kind==1&&p.taken)k++;return got>=3&&sw>=3&&k>=1&&mem>=4;}return false;}
void Intro(float t,const Assets&a){
    Camera3D c{V(0,2.3f,15-28*Ease(t/4.5f)),V(0,2.1f,-16),V(0,1,0),63,CAMERA_PERSPECTIVE};BeginMode3D(c);
    Box(a.tex[0],V(0,-.15f,-6),V(12,.3f,44),WHITE);Box(a.tex[1],V(-6,2.5f,-6),V(.35f,5,44),WHITE);Box(a.tex[1],V(6,2.5f,-6),V(.35f,5,44),WHITE);
    for(int i=0;i<8;i++){float z=12-i*4.8f;Box(a.tex[26],V(0,0.25f,z),V(11,.08f,.18f),WHITE);Box(a.tex[27],V(0,4.7f,z),V(11,.08f,.18f),WHITE);}
    DrawCylinder(V(0,2.2f,-20),4.2f,4.2f,.5f,40,Color{8,20,28,255});DrawCylinderWires(V(0,2.2f,-20),4.5f,4.5f,.65f,40,Theme(0));
    DrawSphere(V(0,3.2f,-20),.8f,Color{50,205,255,255});DrawSphereWires(V(0,3.2f,-20),1.0f,12,12,RAYWHITE);EndMode3D();
    Center("TAMASRAZIM PRESENTS",70,16,Color{150,210,230,255});if(t>3.1f)Center("NEON VAULT",GetScreenHeight()/2-35,62,RAYWHITE);if(t>3.7f)Center("100 FLOORS. ZERO SHORTCUTS.",GetScreenHeight()/2+42,17,SKYBLUE);
    DrawText("ENTER / ESC — SKIP",GetScreenWidth()-185,GetScreenHeight()-30,12,GRAY);
}
void Menu(const Save&s,const Assets&a,int focus){
    ClearBackground(Color{3,8,13,255});Camera3D c{V(0,3,10),V(0,2,-10),V(0,1,0),65,CAMERA_PERSPECTIVE};BeginMode3D(c);
    Box(a.tex[0],V(0,-.15f,-10),V(18,.3f,42),WHITE);for(int i=0;i<8;i++)Box(a.tex[26],V(0,.2f,6-i*4.5f),V(17,.08f,.12f),WHITE);EndMode3D();
    DrawRectangle(0,0,GetScreenWidth(),GetScreenHeight(),Color{0,4,9,175});Center("NEON VAULT",68,62,RAYWHITE);Center("100-FLOOR FIRST-PERSON PUZZLE EXPEDITION",145,18,LIGHTGRAY);Center("STABILITY BUILD  •  25 MB+ ASSET BANK",204,12,GRAY);Center(TextFormat("PROGRESS %03d / %03d",s.unlocked,LEVELS),178,15,SKYBLUE);
    float x=GetScreenWidth()/2.0f-190;BtnDrawEx({x,235,380,54},"ENTER VAULT",SKYBLUE,focus==0);BtnDrawEx({x,301,380,54},"FLOOR SELECT",Theme(1),focus==1);BtnDrawEx({x,367,380,54},"SETTINGS",Theme(2),focus==2);BtnDrawEx({x,433,380,54},"CREDITS",Theme(4),focus==3);BtnDrawEx({x,499,380,54},"QUIT",RED,focus==4);
}
void World(const Level&l,const Assets&a,Vector3 player,float yaw,float pitch,float bob,const Settings&s,float scan,int got,int sw,int mem,float shake){
    const bool exitOpen=l.objective==Objective::SURVIVE||ObjectiveDone(l,got,sw,mem);
    Camera3D c{};
    Vector3 shakeOffset{};
    if(s.shake&&shake>0.0f){
        float t=float(GetTime())*47.0f;
        float a=shake*0.055f;
        shakeOffset=V(sinf(t*1.7f)*a,sinf(t*2.3f+1.2f)*a*0.75f,cosf(t*1.9f)*a);
    }
    c.position=Vector3Add(Vector3Add(player,V(0,0.62f+bob,0)),shakeOffset);
    c.target=Vector3Add(c.position,V(sinf(yaw)*cosf(pitch),sinf(pitch),cosf(yaw)*cosf(pitch)));c.up=V(0,1,0);c.fovy=s.fov;c.projection=CAMERA_PERSPECTIVE;BeginMode3D(c);
    Box(a.tex[l.theme%TEXTURES],V(0,-.05f,0),V(58,.1f,58),WHITE);
    Box(a.tex[25],V(0,5.8f,0),V(58,.12f,58),Color{42,52,62,255});
    for(size_t i=0;i<l.walls.size();i++){const auto&w=l.walls[i];Box(a.tex[(l.theme*3+int(i)+w.mat)%TEXTURES],w.p,w.s,WHITE);DrawCubeWires(w.p,w.s.x,w.s.y,w.s.z,Color{60,95,115,150});}
    for(int i=0;i<34;i++){
        uint32_t seed=Mix(uint32_t(l.id*4099+i*977));
        float fx=float(seed%5200)/100.0f-26.0f;
        float fz=float((seed>>8)%5200)/100.0f-26.0f;
        float fy=1.25f+float((seed>>16)%170)/100.0f+sinf(float(GetTime())*0.65f+i)*0.10f;
        float twinkle=0.055f+0.025f*sinf(float(GetTime())*2.2f+i*1.37f);
        float driftX=0.22f*sinf(float(GetTime())*0.55f+i*0.71f);
        float driftZ=0.18f*cosf(float(GetTime())*0.47f+i*0.53f);
        DrawSphere(V(fx+driftX,fy,fz+driftZ),twinkle,Theme(l.theme));
    }
    for(int i=0;i<8;i++){
        float a=TAU*float(i)/8.0f+float(GetTime())*0.13f;
        Vector3 q=V(cosf(a)*9.0f,2.3f+sinf(float(GetTime())*0.8f+i)*0.7f,-18.0f+sinf(a)*7.0f);
        DrawBrokenPiece(q,0.28f,5,float(GetTime())*0.9f+i*0.4f,Theme((l.theme+i)%10));
    }
    for(int i=-4;i<=4;i++){
        float x=float(i)*6.0f;
        Box(a.tex[26],V(x,2.9f,-27.9f),V(0.16f,5.6f,0.22f),WHITE);
        Box(a.tex[26],V(x,2.9f,27.9f),V(0.16f,5.6f,0.22f),WHITE);
    }
    for(int i=-5;i<=5;i++){
        float z=float(i)*4.8f;
        Box(a.tex[27],V(-27.9f,0.22f,z),V(0.22f,0.12f,3.4f),WHITE);
        Box(a.tex[27],V(27.9f,0.22f,z),V(0.22f,0.12f,3.4f),WHITE);
    }
    for(int i=-5;i<=5;i++){
        float z=float(i)*5.5f;
        Box(a.tex[27],V(0,0.025f,z),V(0.14f,0.035f,3.0f),WHITE);
    }
    for(int i=0;i<4;i++){
        float a0=TAU*i/4.0f+float(GetTime())*0.25f;
        Vector3 p=V(l.exit.x+cosf(a0)*2.5f,0.28f,l.exit.z+sinf(a0)*2.5f);
        DrawCylinder(p,0.10f,0.16f,0.22f,8,exitOpen?GREEN:Theme(l.theme));
    }
    Box(a.tex[24],V(l.exit.x,0.03f,l.exit.z),V(3.4f,0.04f,3.4f),Color{175,210,220,220});
    if(!exitOpen){Box(a.tex[18],V(l.exit.x,1.25f,l.exit.z),V(1.6f,2.5f,5.5f),WHITE);DrawCubeWires(V(l.exit.x,1.25f,l.exit.z),1.65f,2.55f,5.55f,ORANGE);}
    else {DrawCylinder(l.exit,1.6f,1.6f,.18f,32,GREEN);DrawCylinderWires(l.exit,1.8f,1.8f,.22f,32,RAYWHITE);}
    for(const auto&p:l.pickups){
        float t=float(GetTime());Color c2=p.kind==0?SKYBLUE:(p.kind==1?GOLD:MAGENTA);
        if(!p.taken){
            Vector3 q=V(p.p.x,p.p.y+.16f*sinf(t*2.7f+p.p.z),p.p.z);
            DrawBrokenPiece(q,p.kind==0?.42f:.34f,p.kind==0?7:5,t*1.25f,c2);
            if(scan>0)DrawSphereWires(q,.75f+scan*.2f,10,10,c2);
        }else if(p.burst>0.0f){
            float phase=1.0f-p.burst;
            Vector3 q=V(p.p.x,p.p.y,p.p.z);
            DrawBrokenPiece(q,.30f+.22f*phase,p.kind==0?8:6,t*1.8f+phase*3.0f,c2);
        }
    }
    for(size_t i=0;i<l.switches.size();i++){const auto& sw=l.switches[i];Vector3 p=sw.p;Color c2=sw.active?GREEN:Theme(l.theme);float pulse=.84f+.16f*sinf(float(GetTime())*3.0f+float(i));DrawCube(p,.72f,1,.42f,sw.active?Color{25,75,50,255}:Color{28,48,58,255});Box(a.tex[(10+l.theme+i)%TEXTURES],V(p.x,p.y+.12f,p.z-.23f),V(.42f,.38f,.05f),WHITE);DrawCubeWires(p,.76f,1.04f,.46f,c2);DrawCylinderWires(V(p.x,p.y+0.62f,p.z),.22f*pulse,.22f*pulse,.05f,16,c2);}
    for(const auto&h:l.hazards){float pulse=.90f+.15f*sinf(float(GetTime())*4+h.phase);Vector3 q=V(h.base.x+sinf(float(GetTime())*h.speed+h.phase)*1.5f,h.base.y,h.base.z);Vector3 hs=V(1.0f*pulse,.95f,2.2f*pulse);Box(a.tex[(20+l.theme)%TEXTURES],q,hs,WHITE);DrawCubeWires(q,hs.x*1.03f,hs.y*1.03f,hs.z*1.03f,RED);if(HitBox(player,PLAYER_R,q,hs))DrawSphere(q,.2f,Color{255,110,110,255});}
    DrawParticles();
    EndMode3D();
}
bool IsBlocked(const Level&l,Vector3 p,bool exitOpen){if(fabsf(p.x)>WORLD-PLAYER_R||fabsf(p.z)>WORLD-PLAYER_R)return true;for(const auto&w:l.walls)if(HitBox(p,PLAYER_R,w.p,w.s))return true;if(!exitOpen&&HitBox(p,PLAYER_R,V(l.exit.x,1.25f,l.exit.z),V(1.6f,2.5f,5.5f)))return true;return false;}
void SetDisplay(int mode){if(mode==2){if(!IsWindowFullscreen())ToggleFullscreen();}else if(mode==1){if(IsWindowFullscreen())ToggleFullscreen();SetWindowState(FLAG_WINDOW_UNDECORATED);int m=GetCurrentMonitor();SetWindowSize(GetMonitorWidth(m),GetMonitorHeight(m));SetWindowPosition(0,0);}else{if(IsWindowFullscreen())ToggleFullscreen();ClearWindowState(FLAG_WINDOW_UNDECORATED);SetWindowSize(1440,900);}}
}

int main(int argc,char**argv){
    bool safe=argc>1&&std::strcmp(argv[1],"--safe-mode")==0;
    bool test=argc>1&&std::strcmp(argv[1],"--startup-test")==0;
    if(argc>1&&std::strcmp(argv[1],"--validate")==0){for(int i=1;i<=LEVELS;i++){Level l=BuildLevel(i);Repair(l);if(!Valid(l)){std::printf("FLOOR %d INVALID\n",i);return 1;}}std::printf("NEON VAULT VALIDATION COMPLETE: PASS\n");return 0;}
#if defined(_WIN32)
    EnsureWorkingDirectory();
#endif
    SetConfigFlags(FLAG_WINDOW_RESIZABLE|FLAG_VSYNC_HINT);InitWindow(test?640:1440,test?360:900,"NEON VAULT");
    if(!IsWindowReady())return test?0:2;SetExitKey(KEY_NULL);SetTargetFPS(144);EnableCursor();
    if(test){BeginDrawing();ClearBackground(Color{3,8,13,255});DrawText("NEON VAULT STARTUP TEST",24,24,24,RAYWHITE);EndDrawing();CloseWindow();return 0;}
    if(!safe)InitAudioDevice();Save save=LoadSave();SaveGame(save);Assets assets=LoadAssets(safe);
    if(IsSoundValid(assets.music)){SetSoundVolume(assets.music,.35f);PlaySound(assets.music);}
    if(IsSoundValid(assets.beat)){SetSoundVolume(assets.beat,.22f);PlaySound(assets.beat);}
    Screen screen=Screen::INTRO;Screen settingsReturn=Screen::MENU;float intro=0;Level level=BuildLevel(1);Repair(level);
    Vector3 player=level.start,vel{};float yaw=3.14159265f,pitch=0,timeLeft=0,stamina=100,health=100,scan=0,bob=0,screenShake=0,damageCooldown=0,interactFlash=0;int got=0,sw=0,mem=0;bool grounded=true;
    bool captured=false,ignoreDelta=false;int settingsRow=0,uiFocus=0;

    auto capture=[&](){if(captured)return;DisableCursor();captured=true;ignoreDelta=true;};
    auto release=[&](){if(!captured)return;captured=false;ignoreDelta=false;EnableCursor();SetMouseCursor(MOUSE_CURSOR_DEFAULT);};
    auto start=[&](int id){level=BuildLevel(id);Repair(level);player=level.start;vel={};yaw=3.14159265f;pitch=0;timeLeft=level.timeLimit;stamina=100;health=100;got=sw=mem=0;bob=scan=screenShake=damageCooldown=interactFlash=0;grounded=true;screen=Screen::PLAYING;capture();};
    auto damage=[&](){Burst(player,Color{255,75,95,255},24,3.2f);health-=25;screenShake=1.0f;damageCooldown=0.65f;player=level.start;vel={};timeLeft=std::max(0.0f,timeLeft-4);if(IsSoundValid(assets.hit))PlaySound(assets.hit);if(health<=0){health=0;release();screen=Screen::GAMEOVER;}};

    while(!WindowShouldClose()){
        float dt=std::min(GetFrameTime(),.05f);
        UpdateParticles(dt);
        if(IsSoundValid(assets.music)&&!IsSoundPlaying(assets.music))PlaySound(assets.music);
        if(IsSoundValid(assets.beat)&&!IsSoundPlaying(assets.beat))PlaySound(assets.beat);
        if(screen!=Screen::PLAYING&&!captured)EnableCursor();else if(screen!=Screen::PLAYING&&captured)release();
        if(screen==Screen::INTRO){intro+=dt;if(IsKeyPressed(KEY_ENTER)||IsKeyPressed(KEY_ESCAPE)||intro>=4.5f)screen=Screen::MENU;}
        else if(screen==Screen::MENU){
            uiFocus=std::clamp(uiFocus,0,4);UIVertical(5,uiFocus);
            float x=GetScreenWidth()/2.0f-190;
            Rectangle r0{x,235,380,54},r1{x,301,380,54},r2{x,367,380,54},r3{x,433,380,54},r4{x,499,380,54};
            if(CheckCollisionPointRec(GetMousePosition(),r0))uiFocus=0;
            else if(CheckCollisionPointRec(GetMousePosition(),r1))uiFocus=1;
            else if(CheckCollisionPointRec(GetMousePosition(),r2))uiFocus=2;
            else if(CheckCollisionPointRec(GetMousePosition(),r3))uiFocus=3;
            else if(CheckCollisionPointRec(GetMousePosition(),r4))uiFocus=4;
            if(UIActivate(uiFocus,0,r0)){if(IsSoundValid(assets.click))PlaySound(assets.click);start(1);}
            else if(UIActivate(uiFocus,1,r1)){if(IsSoundValid(assets.click))PlaySound(assets.click);screen=Screen::LEVELS;uiFocus=0;}
            else if(UIActivate(uiFocus,2,r2)){if(IsSoundValid(assets.click))PlaySound(assets.click);settingsReturn=Screen::MENU;screen=Screen::SETTINGS;uiFocus=0;}
            else if(UIActivate(uiFocus,3,r3)){if(IsSoundValid(assets.click))PlaySound(assets.click);screen=Screen::CREDITS;}
            else if(UIActivate(uiFocus,4,r4)){if(IsSoundValid(assets.click))PlaySound(assets.click);break;}
        }else if(screen==Screen::LEVELS){
            Rectangle backRect{GetScreenWidth()/2.0f-170,GetScreenHeight()-78,340,48};
            int maxFloor=std::max(0,save.unlocked-1);
            uiFocus=std::clamp(uiFocus,0,maxFloor+1);
            if(IsKeyPressed(KEY_UP))uiFocus=std::max(0,uiFocus-10);
            if(IsKeyPressed(KEY_DOWN))uiFocus=std::min(maxFloor,uiFocus+10);
            if(IsKeyPressed(KEY_LEFT))uiFocus=std::max(0,uiFocus-1);
            if(IsKeyPressed(KEY_RIGHT))uiFocus=std::min(maxFloor,uiFocus+1);
            if(IsKeyPressed(KEY_HOME))uiFocus=0;
            if(IsKeyPressed(KEY_END))uiFocus=maxFloor;
            int cols=10,cw=82,ch=55,sx=(GetScreenWidth()-cols*cw)/2,sy=145;
            for(int i=1;i<=LEVELS;i++){
                int col=(i-1)%cols,row=(i-1)/cols;Rectangle r{float(sx+col*cw+4),float(sy+row*ch+4),74,47};
                if(i<=save.unlocked&&CheckCollisionPointRec(GetMousePosition(),r))uiFocus=i-1;
                BtnDrawEx(r,TextFormat("%02d",i),i<=save.unlocked?Theme((i-1)%10):Color{55,60,65,255},i<=save.unlocked&&(i-1)==uiFocus);
                if(i<=save.unlocked&&Btn(r)){if(IsSoundValid(assets.click))PlaySound(assets.click);start(i);break;}
            }
            if(uiFocus<save.unlocked&&(IsKeyPressed(KEY_ENTER)||IsKeyPressed(KEY_SPACE))){if(IsSoundValid(assets.click))PlaySound(assets.click);start(uiFocus+1);}
            if(CheckCollisionPointRec(GetMousePosition(),backRect))uiFocus=maxFloor+1;
            if(IsKeyPressed(KEY_ESCAPE)||UIActivate(uiFocus,maxFloor+1,backRect)){if(IsSoundValid(assets.click))PlaySound(assets.click);screen=Screen::MENU;uiFocus=1;}
        }else if(screen==Screen::SETTINGS){
            Rectangle backRect{GetScreenWidth()/2.0f-170,GetScreenHeight()-78,340,48};
            UIVertical(10,uiFocus);
            settingsRow=std::clamp(uiFocus,0,8);
            {
                Vector2 mouse=GetMousePosition();
                for(int i=0;i<9;i++){
                    Rectangle rowRect{GetScreenWidth()/2.0f-300,110+i*58,600,46};
                    if(CheckCollisionPointRec(mouse,rowRect)){
                        settingsRow=i;uiFocus=i;
                        if(IsMouseButtonPressed(MOUSE_BUTTON_LEFT)){
                            switch(i){
                                case 0:save.settings.sens=Clamp(save.settings.sens+0.0002f,.0007f,.006f);break;
                                case 1:save.settings.invertY=!save.settings.invertY;break;
                                case 2:save.settings.fov=Clamp(save.settings.fov+5,60,105);break;
                                case 3:save.settings.hints=!save.settings.hints;break;
                                case 4:save.settings.shake=!save.settings.shake;break;
                                case 5:save.settings.crosshair=(save.settings.crosshair+1)%3;break;
                                case 6:save.settings.perf=!save.settings.perf;break;
                                case 7:save.settings.display=(save.settings.display+1)%3;SetDisplay(save.settings.display);break;
                                case 8:save=Save{};SaveGame(save);SetDisplay(0);settingsRow=0;uiFocus=0;break;
                            }
                            if(IsSoundValid(assets.click)){SetSoundVolume(assets.click,0.65f);PlaySound(assets.click);}
                        }
                    }
                }
                if(CheckCollisionPointRec(mouse,backRect))uiFocus=9;
            }
            if(IsKeyPressed(KEY_ESCAPE)||Btn(backRect)||(uiFocus==9&&(IsKeyPressed(KEY_ENTER)||IsKeyPressed(KEY_SPACE)))){SaveGame(save);screen=settingsReturn;uiFocus=(settingsReturn==Screen::PAUSED)?0:(settingsReturn==Screen::MENU?2:0);}
            else if(uiFocus<9&&(IsKeyPressed(KEY_LEFT)||IsKeyPressed(KEY_RIGHT)||IsKeyPressed(KEY_ENTER)||IsKeyPressed(KEY_SPACE))){
                int d=IsKeyPressed(KEY_LEFT)?-1:1;
                switch(settingsRow){
                    case 0:save.settings.sens=Clamp(save.settings.sens+d*.0002f,.0007f,.006f);break;
                    case 1:save.settings.invertY=!save.settings.invertY;break;
                    case 2:save.settings.fov=Clamp(save.settings.fov+d*5,60,105);break;
                    case 3:save.settings.hints=!save.settings.hints;break;
                    case 4:save.settings.shake=!save.settings.shake;break;
                    case 5:save.settings.crosshair=(save.settings.crosshair+d+3)%3;break;
                    case 6:save.settings.perf=!save.settings.perf;break;
                    case 7:save.settings.display=(save.settings.display+d+3)%3;SetDisplay(save.settings.display);break;
                    case 8:save=Save{};SaveGame(save);SetDisplay(0);uiFocus=0;break;
                }
            }
        }else if(screen==Screen::CREDITS){if(IsKeyPressed(KEY_ESCAPE)||IsKeyPressed(KEY_ENTER)||IsKeyPressed(KEY_SPACE)||IsMouseButtonPressed(MOUSE_BUTTON_LEFT))screen=Screen::MENU;}
        else if(screen==Screen::PLAYING){
            if(!IsWindowFocused()){if(captured)release();screen=Screen::PAUSED;continue;}
            if(IsKeyPressed(KEY_ESCAPE)){release();screen=Screen::PAUSED;}
            if(screen!=Screen::PLAYING)continue;
            if(IsWindowFocused()&&!captured)capture();
            if(screen==Screen::PLAYING&&captured){Vector2 md=GetMouseDelta();if(ignoreDelta){md={0,0};ignoreDelta=false;}yaw-=md.x*save.settings.sens;pitch+=(save.settings.invertY?md.y:-md.y)*save.settings.sens;pitch=Clamp(pitch,-1.48f,1.48f);}
            Vector3 wish{};if(IsKeyDown(KEY_W))wish.z+=1;if(IsKeyDown(KEY_S))wish.z-=1;if(IsKeyDown(KEY_A))wish.x-=1;if(IsKeyDown(KEY_D))wish.x+=1;if(Vector3Length(wish)>.01f)wish=Vector3Normalize(wish);
            Vector3 f=V(sinf(yaw),0,cosf(yaw)),r=V(-f.z,0,f.x);Vector3 mv=Vector3Add(Vector3Scale(r,wish.x),Vector3Scale(f,wish.z));if(Vector3Length(mv)>.01f)mv=Vector3Normalize(mv);
            bool sprint=IsKeyDown(KEY_LEFT_SHIFT)&&stamina>1&&Vector3Length(mv)>.01f;float speed=sprint?8.1f:5.0f;stamina=sprint?std::max(0.0f,stamina-22*dt):std::min(100.0f,stamina+14*dt);
            for(int i=0;i<2;i++){Vector3 n=player;n.x+=mv.x*speed*dt/2.0f;if(!IsBlocked(level,n,level.objective==Objective::SURVIVE||ObjectiveDone(level,got,sw,mem)))player.x=n.x;n=player;n.z+=mv.z*speed*dt/2.0f;if(!IsBlocked(level,n,level.objective==Objective::SURVIVE||ObjectiveDone(level,got,sw,mem)))player.z=n.z;}
            for(int guard=0;guard<3;guard++){
                bool moved=false;
                for(const auto& w:level.walls)if(HitBox(player,PLAYER_R,w.p,w.s)){
                    float dx=player.x-w.p.x,dz=player.z-w.p.z;
                    if(fabsf(dx)>fabsf(dz))player.x+=(dx>=0?.12f:-.12f);else player.z+=(dz>=0?.12f:-.12f);
                    moved=true;break;
                }
                if(!moved)break;
            }
            if(IsKeyPressed(KEY_SPACE)&&grounded){vel.y=6.7f;grounded=false;}vel.y-=18*dt;player.y+=vel.y*dt;if(player.y<=.9f){player.y=.9f;vel.y=0;grounded=true;}
            for(auto& p:level.pickups)if(p.burst>0.0f)p.burst=std::max(0.0f,p.burst-dt);interactFlash=std::max(0.0f,interactFlash-dt*4.0f);timeLeft-=dt;scan=std::max(0.0f,scan-dt);screenShake=std::max(0.0f,screenShake-dt*4.5f);damageCooldown=std::max(0.0f,damageCooldown-dt);if(IsKeyPressed(KEY_Q))scan=1.4f;if(Vector3Length(mv)>.01f)bob+=dt*(sprint?13:9);else bob+=dt*2;
            for(const auto&h:level.hazards){Vector3 q=V(h.base.x+sinf(float(GetTime())*h.speed+h.phase)*1.5f,h.base.y,h.base.z);if(damageCooldown<=0.0f&&Vector3Distance(player,q)<1.0f){damage();break;}}
            if(screen!=Screen::PLAYING)continue;
            if(IsKeyPressed(KEY_E)){float best=2.25f;int type=-1,idx=-1;for(int i=0;i<(int)level.switches.size();i++)if(!level.switches[i].active&&Vector3Distance(player,level.switches[i].p)<best){best=Vector3Distance(player,level.switches[i].p);type=1;idx=i;}for(int i=0;i<(int)level.pickups.size();i++)if(!level.pickups[i].taken&&Vector3Distance(player,level.pickups[i].p)<best){best=Vector3Distance(player,level.pickups[i].p);type=2;idx=i;}
                if(type==1){level.switches[idx].active=true;sw++;interactFlash=1.0f;Burst(level.switches[idx].p,Theme(level.theme),18,2.1f);if(IsSoundValid(assets.click))PlaySound(assets.click);}
                else if(type==2){auto&p=level.pickups[idx];if(p.kind==2){if(p.order==mem+1){p.taken=true;p.burst=0.95f;interactFlash=1.0f;Burst(p.p,MAGENTA,22,2.6f);mem++;}else{mem=0;timeLeft=std::max(0.0f,timeLeft-6);health=std::max(1.0f,health-10);if(IsSoundValid(assets.hit))PlaySound(assets.hit);}}else{p.taken=true;p.burst=0.95f;interactFlash=1.0f;Color burstColor=p.kind==0?SKYBLUE:GOLD;Burst(p.p,burstColor,22,2.6f);if(p.kind==0)got++;}if(IsSoundValid(assets.pickup))PlaySound(assets.pickup);}
            }
            bool done=ObjectiveDone(level,got,sw,mem);
            if(screen==Screen::PLAYING&&done&&Vector3Distance(player,level.exit)<2.6f){int stars=timeLeft/level.timeLimit>.55f&&health>50?3:(timeLeft>0?2:1);save.stars[level.id]=std::max(save.stars[level.id],stars);if(level.id<LEVELS)save.unlocked=std::max(save.unlocked,level.id+1);SaveGame(save);release();screen=level.id==LEVELS?Screen::COMPLETE:Screen::LEVELS;}
            if(screen==Screen::PLAYING&&level.objective!=Objective::SURVIVE&&timeLeft<=0){release();screen=Screen::GAMEOVER;}
            if(level.objective==Objective::SURVIVE&&timeLeft<=0){save.stars[level.id]=3;if(level.id<LEVELS)save.unlocked=std::max(save.unlocked,level.id+1);SaveGame(save);release();screen=level.id==LEVELS?Screen::COMPLETE:Screen::LEVELS;}
        }else if(screen==Screen::PAUSED){
            uiFocus=std::clamp(uiFocus,0,2);UIVertical(3,uiFocus);
            float x=GetScreenWidth()/2.0f-190;Rectangle r0{x,330,380,54},r1{x,396,380,54},r2{x,462,380,54};
            if(CheckCollisionPointRec(GetMousePosition(),r0))uiFocus=0;else if(CheckCollisionPointRec(GetMousePosition(),r1))uiFocus=1;else if(CheckCollisionPointRec(GetMousePosition(),r2))uiFocus=2;
            if(IsKeyPressed(KEY_ESCAPE)){capture();screen=Screen::PLAYING;}
            else if(UIActivate(uiFocus,0,r0)){capture();screen=Screen::PLAYING;}
            else if(UIActivate(uiFocus,1,r1)){settingsReturn=Screen::PAUSED;screen=Screen::SETTINGS;uiFocus=0;}
            else if(UIActivate(uiFocus,2,r2)){screen=Screen::MENU;uiFocus=4;}
        }else if(screen==Screen::GAMEOVER){
            uiFocus=std::clamp(uiFocus,0,1);UIVertical(2,uiFocus);
            float x=GetScreenWidth()/2.0f-190;Rectangle r0{x,465,380,54},r1{x,531,380,54};
            if(CheckCollisionPointRec(GetMousePosition(),r0))uiFocus=0;else if(CheckCollisionPointRec(GetMousePosition(),r1))uiFocus=1;
            if(IsKeyPressed(KEY_R)||UIActivate(uiFocus,0,r0))start(level.id);
            else if(IsKeyPressed(KEY_ESCAPE)||UIActivate(uiFocus,1,r1)){screen=Screen::MENU;uiFocus=4;}
        }else if(screen==Screen::COMPLETE){uiFocus=0;if(UIActivate(uiFocus,0,{GetScreenWidth()/2.0f-190,490,380,54}))screen=Screen::LEVELS;}
        BeginDrawing();
        if(screen==Screen::INTRO){ClearBackground(Color{3,8,13,255});Intro(intro,assets);}
        else if(screen==Screen::MENU)Menu(save,assets,uiFocus);
        else if(screen==Screen::LEVELS){ClearBackground(Color{4,8,13,255});Center("FLOOR SELECT",38,40,RAYWHITE);Center(TextFormat("UNLOCKED %03d / %03d",save.unlocked,LEVELS),88,15,SKYBLUE);int cols=10,cw=82,ch=55,sx=(GetScreenWidth()-cols*cw)/2,sy=130;for(int i=1;i<=LEVELS;i++){int col=(i-1)%cols,row=(i-1)/cols;Rectangle r{float(sx+col*cw+4),float(sy+row*ch+4),74,47};BtnDraw(r,TextFormat("%02d",i),i<=save.unlocked?Theme((i-1)%10):Color{55,60,65,255});if(i<=save.unlocked&&save.stars[i])DrawText(TextFormat("★%d",save.stars[i]),int(r.x+48),int(r.y+29),10,GOLD);}BtnDraw({GetScreenWidth()/2.0f-170,GetScreenHeight()-78,340,48},"BACK TO MENU",Color{80,145,180,255});}
        else if(screen==Screen::SETTINGS){ClearBackground(Color{4,8,13,255});Center("SETTINGS",38,40,RAYWHITE);Center("CLICK A ROW TO CHANGE  •  ARROWS / ENTER ALSO WORK",78,13,GRAY);const char*lab[9]={"MOUSE SENSITIVITY","INVERT Y","FIELD OF VIEW","HINTS","SCREEN SHAKE","CROSSHAIR","PERFORMANCE","DISPLAY","RESET SAVE"};std::string val[9]={TextFormat("%.4f",save.settings.sens),save.settings.invertY?"ON":"OFF",TextFormat("%.0f",save.settings.fov),save.settings.hints?"ON":"OFF",save.settings.shake?"ON":"OFF",TextFormat("STYLE %d",save.settings.crosshair+1),save.settings.perf?"ON":"OFF",save.settings.display==0?"WINDOWED":save.settings.display==1?"BORDERLESS":"FULLSCREEN","ENTER TO RESET"};for(int i=0;i<9;i++){Rectangle r{GetScreenWidth()/2.0f-300,110+i*58,600,46};bool hot=i==settingsRow||CheckCollisionPointRec(GetMousePosition(),r);DrawRectangleRounded(r,.08f,8,hot?Color{20,42,58,255}:Color{11,22,32,255});DrawRectangleRoundedLines(r,.08f,8,hot?SKYBLUE:Color{45,62,78,255});DrawText(lab[i],int(r.x+18),int(r.y+14),15,RAYWHITE);DrawText(val[i].c_str(),int(r.x+390),int(r.y+14),15,SKYBLUE);}BtnDrawEx({GetScreenWidth()/2.0f-170,GetScreenHeight()-78,340,48},"BACK",Color{80,145,180,255},uiFocus==9);}
        else if(screen==Screen::CREDITS){ClearBackground(Color{4,8,13,255});Center("CREDITS",70,44,RAYWHITE);Center("TAMASRAZIM",175,30,SKYBLUE);Center("NEON VAULT — NATIVE WINDOWS x64",225,17,LIGHTGRAY);Center("100 deterministic floors • procedural 3D • original instrumental",260,15,GRAY);Center("ESC / CLICK — BACK",500,14,GRAY);}
        else if(screen==Screen::PLAYING||screen==Screen::PAUSED){ClearBackground(Color{3,8,13,255});World(level,assets,player,yaw,pitch,captured?sinf(bob)*.025f:0,save.settings,scan,got,sw,mem,screenShake);DrawRectangle(22,22,420,126,Color{4,13,21,225});DrawText(TextFormat("FLOOR %03d • %s",level.id,level.title.c_str()),38,40,18,RAYWHITE);DrawText(ObjName(level.objective),38,66,13,Theme(level.theme));DrawText(TextFormat("TIME %03d  HP %03d  STAM %03d",int(std::max(0.0f,timeLeft)),int(health),int(stamina)),38,91,14,RAYWHITE);int keyCount=0;for(const auto&x:level.pickups)if(x.kind==1&&x.taken)keyCount++;if(level.objective==Objective::COLLECT)DrawText(TextFormat("OBJECTIVE  CRYSTALS %d / %d",got,level.required),38,112,12,Theme(level.theme));else if(level.objective==Objective::SWITCHES)DrawText(TextFormat("OBJECTIVE  SWITCHES %d / %d",sw,level.required),38,112,12,Theme(level.theme));else if(level.objective==Objective::KEYCARD)DrawText(TextFormat("OBJECTIVE  KEYCARDS %d / %d",keyCount,level.required),38,112,12,Theme(level.theme));else if(level.objective==Objective::MEMORY)DrawText(TextFormat("OBJECTIVE  MEMORY %d / %d",mem,level.required),38,112,12,Theme(level.theme));else if(level.objective==Objective::COMBO)DrawText(TextFormat("OBJECTIVE  C%d/3 S%d/3 K%d/1 M%d/4",got,sw,keyCount,mem),38,112,12,Theme(level.theme));else DrawText("OBJECTIVE  SURVIVE",38,112,12,Theme(level.theme));if(captured&&save.settings.hints)Center("ESC — PAUSE / RELEASE MOUSE",GetScreenHeight()-28,12,GRAY);if(captured)Cross(save.settings.crosshair); if(interactFlash>0.0f)DrawRectangle(0,0,GetScreenWidth(),GetScreenHeight(),Color{80,210,255,(unsigned char)(30.0f*interactFlash)}); if(save.settings.hints&&captured){float nearest=2.25f;for(const auto&x:level.switches)if(!x.active)nearest=std::min(nearest,Vector3Distance(player,x.p));for(const auto&x:level.pickups)if(!x.taken)nearest=std::min(nearest,Vector3Distance(player,x.p));if(nearest<2.25f)Center("E — INTERACT",GetScreenHeight()/2+34,15,SKYBLUE);} if(save.settings.perf){DrawRectangle(GetScreenWidth()-220,22,198,90,Color{4,13,21,225});DrawText(TextFormat("FPS %d",GetFPS()),GetScreenWidth()-204,40,13,RAYWHITE);DrawText(TextFormat("FRAME %.2f ms",GetFrameTime()*1000),GetScreenWidth()-204,60,13,RAYWHITE);int vram=QueryDedicatedVRAMMB();DrawText(vram?TextFormat("VRAM %d MB",vram):"VRAM N/A",GetScreenWidth()-204,80,13,RAYWHITE);}if(screen==Screen::PAUSED){DrawRectangle(0,0,GetScreenWidth(),GetScreenHeight(),Color{0,5,10,170});Center("PAUSED",185,50,RAYWHITE);Center("FLOOR PROGRESS PRESERVED",236,16,LIGHTGRAY);BtnDrawEx({GetScreenWidth()/2.0f-190,330,380,54},"RESUME • CAPTURE MOUSE",SKYBLUE,uiFocus==0);BtnDrawEx({GetScreenWidth()/2.0f-190,396,380,54},"SETTINGS",Theme(2),uiFocus==1);BtnDrawEx({GetScreenWidth()/2.0f-190,462,380,54},"MAIN MENU",Color{230,90,120,255},uiFocus==2);}}
        else if(screen==Screen::GAMEOVER){ClearBackground(Color{20,6,10,255});Center("SYSTEM FAILURE",160,56,RED);Center(TextFormat("FLOOR %03d",level.id),230,22,RAYWHITE);BtnDrawEx({GetScreenWidth()/2.0f-190,465,380,54},"RETRY FLOOR • R",ORANGE,uiFocus==0);BtnDrawEx({GetScreenWidth()/2.0f-190,531,380,54},"MAIN MENU • ESC",Color{230,90,120,255},uiFocus==1);}
        else if(screen==Screen::COMPLETE){ClearBackground(Color{5,14,18,255});Center("VAULT MASTER",155,58,GREEN);Center("ALL 100 FLOORS COMPLETE",228,24,RAYWHITE);int total=0;for(int i=1;i<=LEVELS;i++)total+=save.stars[i];Center(TextFormat("TOTAL STARS %d / %d",total,LEVELS*3),268,18,GOLD);BtnDraw({GetScreenWidth()/2.0f-190,490,380,54},"RETURN TO FLOOR SELECT",GREEN);}
        EndDrawing();
    }
    SaveGame(save);release();UnloadAssets(assets);if(IsAudioDeviceReady())CloseAudioDevice();CloseWindow();return 0;
}
#include "raylib.h"
#include "raymath.h"

#include <algorithm>
#include <array>
#include <cmath>
#include <cstdint>
#include <cstdlib>
#include <cstring>
#include <queue>
#include <fstream>
#include <string>
#include <vector>
enum class Screen { MENU, LEVEL_SELECT, PLAYING, PAUSED, SETTINGS, COMPLETE, CREDITS };
enum class PuzzleType { COLLECT, KEY_DOOR, SWITCH_GATE, PRESSURE_PLATE, MEMORY, TIMED_GATE, TELEPORT, SEQUENCE, MOVING_GATE, FINALE };

struct Settings {
    float sensitivity = 0.0022f;
    bool invertY = false;
    float fov = 70.0f;
    bool hints = true;
    bool shake = true;
    float uiScale = 1.0f;
    int crosshair = 0;
    int displayMode = 1; // 0 windowed, 1 borderless, 2 fullscreen
    bool performanceMonitor = false;
    int renderScale = 100;
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
    // Floor 1 targets a real 10+ minute first run instead of tutorial pacing.
    c.crystals=8+std::min(7,tier+sub/2);
    c.obstacles=18+std::min(32,tier*3+sub);
    c.hazards=2+tier/2+sub/4;
    c.timeLimit=900.0f+std::min(900,tier*60);
    if(c.puzzle==PuzzleType::KEY_DOOR||c.puzzle==PuzzleType::FINALE)c.keys=1+tier/4;
    if(c.puzzle==PuzzleType::SWITCH_GATE||c.puzzle==PuzzleType::TIMED_GATE||c.puzzle==PuzzleType::FINALE)c.switches=1+tier/5;
    if(c.puzzle==PuzzleType::MEMORY||c.puzzle==PuzzleType::FINALE)c.memoryLength=3+tier/2+sub/4;
    if(c.puzzle==PuzzleType::SEQUENCE||c.puzzle==PuzzleType::FINALE)c.sequenceLength=3+tier/3+sub/3;
    if(c.puzzle==PuzzleType::TELEPORT)c.crystals=std::max(4,c.crystals);
    if(c.puzzle==PuzzleType::FINALE){c.obstacles+=4;c.hazards+=2;c.timeLimit-=8;}
    if(n==100){c.puzzle=PuzzleType::FINALE;c.crystals=18;c.keys=3;c.switches=4;c.memoryLength=9;c.sequenceLength=10;c.obstacles=48;c.hazards=14;c.timeLimit=1800;}
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
    o<<"displayMode "<<d.settings.displayMode<<"\n";
    o<<"performanceMonitor "<<(d.settings.performanceMonitor?1:0)<<"\n";
    o<<"renderScale "<<d.settings.renderScale<<"\n";
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
        else if(k=="displayMode")in>>d.settings.displayMode;
        else if(k=="performanceMonitor"){int v;in>>v;d.settings.performanceMonitor=v!=0;}
        else if(k=="renderScale")in>>d.settings.renderScale;
        else if(k=="star"){int n=0,s=0;in>>n>>s;if(n>=1&&n<=LEVELS)d.stars[n]=std::clamp(s,0,3);}
    }
    d.unlocked=std::clamp(d.unlocked,1,LEVELS);
    d.settings.sensitivity=Clamp(d.settings.sensitivity,0.0008f,0.005f);
    d.settings.fov=Clamp(d.settings.fov,60.0f,100.0f);
    d.settings.uiScale=Clamp(d.settings.uiScale,0.85f,1.2f);
    d.settings.crosshair=std::clamp(d.settings.crosshair,0,2);
    d.settings.displayMode=std::clamp(d.settings.displayMode,0,2);
    d.settings.renderScale=std::clamp(d.settings.renderScale,50,100);
    return d;
}
static bool BoxesOverlapXZ(Vector3 a,Vector3 as,Vector3 b,Vector3 bs,float padding=0.0f){
    return fabsf(a.x-b.x) < (as.x+bs.x)*0.5f+padding &&
           fabsf(a.z-b.z) < (as.z+bs.z)*0.5f+padding;
}
static bool HitsBox(Vector3 p,float r,Vector3 c,Vector3 s){
    Vector3 h=Vector3Scale(s,0.5f);
    float x=Clamp(p.x,c.x-h.x,c.x+h.x),z=Clamp(p.z,c.z-h.z,c.z+h.z);
    float dx=p.x-x,dz=p.z-z;
    return dx*dx+dz*dz<r*r;
}
static bool InCameraFrustum(const Camera3D& cam,Vector3 p,float radius){
    Vector3 to=Vector3Subtract(p,cam.position);
    float dist=Vector3Length(to);
    if(dist<=0.01f) return true;
    if(dist>190.0f+radius) return false;
    Vector3 forward=Vector3Normalize(Vector3Subtract(cam.target,cam.position));
    Vector3 dir=Vector3Scale(to,1.0f/dist);
    float vf=cam.fovy*DEG2RAD;
    float hf=2.0f*atanf(tanf(vf*0.5f)*(float)GetScreenWidth()/(float)GetScreenHeight());
    float angle=acosf(Clamp(Vector3DotProduct(forward,dir),-1.0f,1.0f));
    float maxFov=std::max(vf,hf)*0.5f;
    float pad=asinf(Clamp(radius/dist,0.0f,0.999f));
    return angle<=maxFov+pad;
}
extern int QueryDedicatedVRAMMB();
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
static void WorldButton(Camera3D cam,Vector3 pos,Vector3 size,const char* label,bool hover,Color accent){
    Color body=hover?Color{24,52,70,255}:Color{11,26,38,255};
    DrawCube(pos,size.x,size.y,size.z,body);
    DrawCubeWires(pos,size.x,size.y,size.z,hover?accent:Color{55,93,116,255});
    Vector2 p=GetWorldToScreen(pos,cam);
    int fs=22,w=MeasureText(label,fs);
    DrawText(label,(int)(p.x-w*0.5f),(int)(p.y-fs*0.5f),fs,RAYWHITE);
}
static void WorldFrame(Camera3D cam,Vector3 pos,Vector3 size,Color c){
    DrawCube(pos,size.x,size.y,size.z,Color{7,16,25,235});
    DrawCubeWires(pos,size.x,size.y,size.z,c);
}

static const char* PBR_VERTEX_SHADER=R"GLSL(
#version 330
in vec3 vertexPosition;
in vec3 vertexNormal;
in vec4 vertexColor;
uniform mat4 mvp;
uniform mat4 matModel;
out vec3 fragWorldPos;
out vec3 fragWorldNormal;
out vec4 fragVertexColor;
void main(){
    vec4 world=matModel*vec4(vertexPosition,1.0);
    fragWorldPos=world.xyz;
    fragWorldNormal=normalize(mat3(transpose(inverse(matModel)))*vertexNormal);
    fragVertexColor=vertexColor;
    gl_Position=mvp*vec4(vertexPosition,1.0);
}
)GLSL";

static const char* PBR_FRAGMENT_SHADER=R"GLSL(
#version 330
in vec3 fragWorldPos;
in vec3 fragWorldNormal;
in vec4 fragVertexColor;
uniform vec3 viewPos;
uniform vec3 lightPos;
uniform vec3 lightColor;
uniform vec3 ambientColor;
uniform float roughnessValue;
uniform float metallicValue;
out vec4 finalColor;
const float PI=3.14159265359;
float DistributionGGX(vec3 N,vec3 H,float rough){
    float a=rough*rough,a2=a*a;
    float nh=max(dot(N,H),0.0),nh2=nh*nh;
    float d=nh2*(a2-1.0)+1.0;
    return a2/max(PI*d*d,0.0001);
}
float GeometrySchlickGGX(float nv,float rough){
    float r=rough+1.0,k=(r*r)/8.0;
    return nv/(nv*(1.0-k)+k);
}
float GeometrySmith(vec3 N,vec3 V,vec3 L,float rough){
    return GeometrySchlickGGX(max(dot(N,V),0.0),rough)*
           GeometrySchlickGGX(max(dot(N,L),0.0),rough);
}
vec3 FresnelSchlick(float ct,vec3 F0){
    return F0+(1.0-F0)*pow(1.0-ct,5.0);
}
void main(){
    vec3 albedo=max(fragVertexColor.rgb,vec3(0.01));
    vec3 N=normalize(fragWorldNormal),V=normalize(viewPos-fragWorldPos);
    vec3 L=normalize(lightPos-fragWorldPos),H=normalize(V+L);
    float dist=max(length(lightPos-fragWorldPos),1.0);
    vec3 radiance=lightColor/(dist*dist*0.025);
    vec3 F0=mix(vec3(0.04),albedo,metallicValue);
    vec3 F=FresnelSchlick(max(dot(H,V),0.0),F0);
    float D=DistributionGGX(N,H,roughnessValue);
    float G=GeometrySmith(N,V,L,roughnessValue);
    vec3 spec=(D*G*F)/max(4.0*max(dot(N,V),0.0)*max(dot(N,L),0.0),0.001);
    vec3 kd=(vec3(1.0)-F)*(1.0-metallicValue);
    vec3 color=(kd*albedo/PI+spec)*radiance*max(dot(N,L),0.0)+ambientColor*albedo;
    color=color/(color+vec3(1.0));
    color=pow(color,vec3(1.0/2.2));
    finalColor=vec4(color,fragVertexColor.a);
}
)GLSL";

int main(int argc,char** argv){
    bool validateMode=false;
    for(int i=1;i<argc;i++)if(std::strcmp(argv[i],"--validate")==0)validateMode=true;

    if(!validateMode){
        SetConfigFlags(FLAG_MSAA_4X_HINT|FLAG_WINDOW_RESIZABLE|FLAG_VSYNC_HINT);
        InitWindow(1440,900,"NEON VAULT");
        SetExitKey(KEY_NULL);
        SetTargetFPS(144);
    }

    SaveData save=LoadGame();
    Settings& settings=save.settings;
    int dedicatedVRAMMB=QueryDedicatedVRAMMB();
    RenderTexture2D sceneTarget{};
    int sceneTargetW=0,sceneTargetH=0;
    Shader pbrShader{};
    bool pbrReady=false;
    if(!validateMode){
        pbrShader=LoadShaderFromMemory(PBR_VERTEX_SHADER,PBR_FRAGMENT_SHADER);
        pbrReady=pbrShader.id>0;
    }
    int pbrViewPosLoc=-1,pbrLightPosLoc=-1,pbrLightColorLoc=-1,pbrAmbientLoc=-1,pbrRoughnessLoc=-1,pbrMetallicLoc=-1;
    if(pbrReady){
        pbrShader.locs[SHADER_LOC_MATRIX_MVP]=GetShaderLocation(pbrShader,"mvp");
        pbrShader.locs[SHADER_LOC_MATRIX_MODEL]=GetShaderLocation(pbrShader,"matModel");
        pbrViewPosLoc=GetShaderLocation(pbrShader,"viewPos");
        pbrLightPosLoc=GetShaderLocation(pbrShader,"lightPos");
        pbrLightColorLoc=GetShaderLocation(pbrShader,"lightColor");
        pbrAmbientLoc=GetShaderLocation(pbrShader,"ambientColor");
        pbrRoughnessLoc=GetShaderLocation(pbrShader,"roughnessValue");
        pbrMetallicLoc=GetShaderLocation(pbrShader,"metallicValue");
    }
    auto EnsureSceneTarget=[&](){
        int sw=std::max(640,GetScreenWidth());
        int sh=std::max(360,GetScreenHeight());
        int rw=std::max(640,(int)roundf(sw*(settings.renderScale/100.0f)));
        int rh=std::max(360,(int)roundf(sh*(settings.renderScale/100.0f)));
        if(sceneTarget.id == 0||rw!=sceneTargetW||rh!=sceneTargetH){
            if(sceneTarget.id != 0)UnloadRenderTexture(sceneTarget);
            sceneTarget=LoadRenderTexture(rw,rh);
            sceneTargetW=rw;sceneTargetH=rh;
        }
    };

    auto ApplyDisplayMode=[&](int mode){
        settings.displayMode=std::clamp(mode,0,2);
        if(settings.displayMode==2){
            ClearWindowState(FLAG_WINDOW_UNDECORATED);
            if(!IsWindowFullscreen())ToggleFullscreen();
        }else if(settings.displayMode==1){
            if(IsWindowFullscreen())ToggleFullscreen();
            SetWindowState(FLAG_WINDOW_UNDECORATED);
            int mon=GetCurrentMonitor();
            SetWindowSize(GetMonitorWidth(mon),GetMonitorHeight(mon));
            SetWindowPosition(0,0);
        }else{
            if(IsWindowFullscreen())ToggleFullscreen();
            ClearWindowState(FLAG_WINDOW_UNDECORATED);
            SetWindowSize(1440,900);
        }
    };
    if(!validateMode && settings.displayMode!=0)ApplyDisplayMode(settings.displayMode);

    Screen screen=Screen::MENU;
    Screen settingsReturn=Screen::MENU;
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
    float currentArenaHalf=21.0f;
    float yaw=PI,pitch=0,vy=0,stamina=100,timeLeft=0,startTime=0;
    float respawnFlash=0,teleportCooldown=0,timedGate=0,memoryFlash=0;
    int memoryProgress=0,sequenceProgress=0,hitsTaken=0;
    bool grounded=true,memoryShowing=false;
    int visibleObjects=0,culledObjects=0;
    float locomotionClock=0.0f;
    float cameraBob=0.0f;
    AudioStream musicStream{};
    bool musicReady=false;
    float musicTime=0.0f;
    std::vector<int16_t> musicBuffer(1470);
    Texture2D skyPhoto{};
    bool skyPhotoReady=false;
    if(!validateMode){
        if(FileExists("assets/sky/tamanna.png")){
            skyPhoto=LoadTexture("assets/sky/tamanna.png");
            skyPhotoReady=skyPhoto.id>0;
            if(skyPhotoReady)SetTextureFilter(skyPhoto,TEXTURE_FILTER_BILINEAR);
        }

        InitAudioDevice();
        musicReady=IsAudioDeviceReady();
        if(musicReady){
            musicStream=LoadAudioStream(44100,16,2);
            if(IsAudioStreamValid(musicStream)){
                SetAudioStreamVolume(musicStream,0.22f);
                PlayAudioStream(musicStream);
            }else{
                musicReady=false;
            }
        }
    }

    bool keysSolved=false,switchesSolved=false,platesSolved=false,memorySolved=false,sequenceSolved=false,puzzleSolved=false;

    auto GenerateLevel=[&](int n){
        level=MakeLevel(n);
        walls.clear();crystals.clear();keys.clear();switches.clear();doors.clear();crates.clear();plates.clear();pads.clear();hazards.clear();
        float arenaHalf=(n==1?30.0f:21.0f+level.tier*0.25f);
        currentArenaHalf=arenaHalf;
        player=V3(0,1,arenaHalf-5);checkpoint=player;yaw=PI;pitch=0;vy=0;stamina=100;
        timeLeft=level.timeLimit;startTime=level.timeLimit;respawnFlash=0;teleportCooldown=0;timedGate=0;
        memoryProgress=0;sequenceProgress=0;hitsTaken=0;grounded=true;
        memoryShowing=level.memoryLength>0;memoryFlash=memoryShowing?1.5f:0;
        keysSolved=level.keys==0;switchesSolved=level.switches==0;
        platesSolved=!(level.puzzle==PuzzleType::PRESSURE_PLATE||level.puzzle==PuzzleType::FINALE);
        memorySolved=level.memoryLength==0;sequenceSolved=level.sequenceLength==0;puzzleSolved=false;

        walls.push_back({V3(0,.8f,-arenaHalf),V3(arenaHalf*2,1.6f,1),true});
        walls.push_back({V3(0,.8f, arenaHalf),V3(arenaHalf*2,1.6f,1),true});
        walls.push_back({V3(-arenaHalf,.8f,0),V3(1,1.6f,arenaHalf*2),true});
        walls.push_back({V3( arenaHalf,.8f,0),V3(1,1.6f,arenaHalf*2),true});

        unsigned seed=0x9E3779B9u^(unsigned)(n*2654435761u);
        auto rng=[&](){seed^=seed<<13;seed^=seed>>17;seed^=seed<<5;return seed;};
        auto rnd=[&](float a,float b){return a+(float)(rng()%10000)/10000.0f*(b-a);};

        for(int i=0;i<level.obstacles;i++){
            bool placed=false;
            for(int attempt=0;attempt<80&&!placed;attempt++){
                float x=rnd(-arenaHalf+2,arenaHalf-2),z=rnd(-arenaHalf+2,arenaHalf-2);
                if(fabsf(x)<3.0f&&z>arenaHalf-8) continue;
                Vector3 pos=V3(x,1,z),size=V3(1.5f+rnd(0,2.6f),2,1.5f+rnd(0,2.6f));
                bool blocked=false;
                for(const auto& b:walls) if(BoxesOverlapXZ(pos,size,b.pos,b.size,0.6f)){blocked=true;break;}
                if(!blocked){walls.push_back({pos,size,true});placed=true;}
            }
        }
        if(level.tier>=7)for(int i=0;i<level.tier-6;i++)
            walls.push_back({V3(0,1,-7.5f+i*2.1f),V3(.8f,2,4.4f),true});

        if(level.puzzle==PuzzleType::MOVING_GATE||level.puzzle==PuzzleType::FINALE){
            for(int i=0;i<1+level.tier/4;i++){
                Box b{V3(0,1,-6+i*4.0f),V3(.9f,2,5),true,true,i*1.3f};
                b.base=b.pos;walls.push_back(b);
            }
        }

        if(n==1){
            static const std::array<Vector3,8> route={
                V3(-21.0f,.85f,24.0f),V3(20.0f,.85f,17.0f),
                V3(-20.0f,.85f,9.0f),V3(20.0f,.85f,1.0f),
                V3(-20.0f,.85f,-7.0f),V3(20.0f,.85f,-15.0f),
                V3(-18.0f,.85f,-23.0f),V3(0.0f,.85f,-26.0f)
            };
            for(const auto& cp:route)crystals.push_back({cp,false});

            const std::array<float,6> barrierZ={19.0f,11.0f,3.0f,-5.0f,-13.0f,-21.0f};
            const std::array<float,6> gapX={-21.0f,21.0f,-21.0f,21.0f,-21.0f,21.0f};
            for(int i=0;i<6;i++){
                float z=barrierZ[i],gap=gapX[i];
                float leftEnd=gap-3.5f;
                float rightStart=gap+3.5f;
                if(leftEnd>-arenaHalf+2.0f)
                    walls.push_back({V3(((-arenaHalf+2.0f)+leftEnd)*0.5f,1,z),
                                     V3(leftEnd-(-arenaHalf+2.0f),2.0f,0.9f),true});
                if(rightStart<arenaHalf-2.0f)
                    walls.push_back({V3((rightStart+(arenaHalf-2.0f))*0.5f,1,z),
                                     V3((arenaHalf-2.0f)-rightStart,2.0f,0.9f),true});
            }
        }else{
            for(int i=0;i<level.crystals;i++){
                float a=(float)i/level.crystals*(2.0f*PI)+n*.37f;
                float r=4.5f+(i%5)*2.6f+level.tier*.35f;
                r=std::min(r,arenaHalf-3.0f);
                Vector3 cp=V3(cosf(a)*r,.85f,sinf(a)*r);
                bool safe=true;
                for(const auto& b:walls) if(HitsBox(cp,0.55f,b.pos,b.size)){safe=false;break;}
                if(!safe) cp=V3(((i%4)-1.5f)*3.3f,.85f,-((i/4)+1)*4.2f);
                crystals.push_back({cp,false});
            }
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
        if(!validateMode){
            DisableCursor();
            screen=Screen::PLAYING;
        }
    };

    auto StartLevel=[&](int n){levelNumber=std::clamp(n,1,LEVELS);GenerateLevel(levelNumber);};

    auto ValidateLevels=[&](){
        bool ok=true;
        auto insideSolid=[&](Vector3 p,float radius){
            for(const auto& b:walls)if(HitsBox(p,radius,b.pos,b.size))return true;
            return false;
        };

        for(int n=1;n<=LEVELS;n++){
            GenerateLevel(n);
            if((int)crystals.size()!=level.crystals)ok=false;
            if(insideSolid(player,PLAYER_RADIUS))ok=false;

            for(const auto& c:crystals)if(insideSolid(c.pos,0.45f))ok=false;
            for(const auto& k:keys)if(insideSolid(k.pos,0.35f))ok=false;
            for(const auto& sw:switches)if(insideSolid(sw.pos,0.35f))ok=false;
            for(const auto& p:plates)if(insideSolid(p.pos,0.35f))ok=false;
            for(const auto& p:pads)if(insideSolid(p.pos,0.35f))ok=false;
            for(const auto& h:hazards)if(insideSolid(h.pos,0.35f))ok=false;

            for(size_t i=0;i<walls.size();i++){
                if(walls[i].size.x<=0.01f||walls[i].size.z<=0.01f)ok=false;
                for(size_t j=i+1;j<walls.size();j++){
                    if(BoxesOverlapXZ(walls[i].pos,walls[i].size,walls[j].pos,walls[j].size,0.0f))
                        ok=false;
                }
            }

            if(n==1){
                float half=(n==1?30.0f:21.0f+level.tier*0.25f);
                const float step=1.0f;
                int minX=(int)std::ceil(-half+1),maxX=(int)std::floor(half-1);
                int minZ=(int)std::ceil(-half+1),maxZ=(int)std::floor(half-1);
                int W=maxX-minX+1,H=maxZ-minZ+1;
                std::vector<unsigned char> seen((size_t)W*(size_t)H,0);
                auto id=[&](int x,int z){return (z-minZ)*W+(x-minX);};
                auto walkable=[&](int x,int z){
                    if(x<minX||x>maxX||z<minZ||z>maxZ)return false;
                    return !insideSolid(V3((float)x,1.0f,(float)z),PLAYER_RADIUS*0.85f);
                };
                std::queue<std::pair<int,int>> q;
                int sx=(int)std::round(player.x),sz=(int)std::round(player.z);
                if(walkable(sx,sz)){seen[id(sx,sz)]=1;q.push({sx,sz});}
                const int dx[4]={1,-1,0,0},dz[4]={0,0,1,-1};
                while(!q.empty()){
                    auto [cx,cz]=q.front();q.pop();
                    for(int d=0;d<4;d++){
                        int nx=cx+dx[d],nz=cz+dz[d];
                        if(walkable(nx,nz)&&!seen[id(nx,nz)]){
                            seen[id(nx,nz)]=1;
                            q.push({nx,nz});
                        }
                    }
                }
                for(const auto& c:crystals){
                    int cx=(int)std::round(c.pos.x),cz=(int)std::round(c.pos.z);
                    if(cx<minX||cx>maxX||cz<minZ||cz>maxZ||!seen[id(cx,cz)])ok=false;
                }
                int ex=0,ez=(int)std::round(-half+2.0f);
                if(ex<minX||ex>maxX||ez<minZ||ez>maxZ||!seen[id(ex,ez)])ok=false;
            }
        }
        return ok;
    };

    auto FillMusic=[&](){
        if(!musicReady) return;
        constexpr int frames=735;
        constexpr float sr=44100.0f;
        static const float roots[8]={261.63f,196.00f,220.00f,174.61f,246.94f,196.00f,293.66f,220.00f};
        static const float fifths[8]={392.00f,293.66f,329.63f,261.63f,369.99f,293.66f,440.00f,329.63f};
        static const float thirds[8]={329.63f,246.94f,277.18f,207.65f,311.13f,246.94f,349.23f,277.18f};
        for(int i=0;i<frames;i++){
            float t=musicTime+(float)i/sr;
            float bar=fmodf(t,300.0f);
            int ci=(int)floorf(bar/37.5f)%8;
            int ni=(ci+1)%8;
            float local=fmodf(bar,37.5f)/37.5f;
            float blend=std::clamp((local-0.78f)/0.22f,0.0f,1.0f);
            auto mix=[&](float a,float b){return a+(b-a)*blend;};
            float root=mix(roots[ci],roots[ni]);
            float fifth=mix(fifths[ci],fifths[ni]);
            float third=mix(thirds[ci],thirds[ni]);
            float swell=0.55f+0.45f*sinf(2.0f*PI*t/18.0f);
            float pulse=0.5f+0.5f*sinf(2.0f*PI*t/7.5f);
            float pad=sinf(2.0f*PI*root*t)*0.10f+sinf(2.0f*PI*fifth*t)*0.045f+sinf(2.0f*PI*third*t)*0.035f;
            float shimmer=sinf(2.0f*PI*(root*2.0f)*t)*0.018f*std::max(0.0f,pulse-0.35f);
            float drone=sinf(2.0f*PI*(root*0.5f)*t)*0.055f;
            float lfo=0.92f+0.08f*sinf(2.0f*PI*t/11.0f);
            float sample=(pad+swell*drone+shimmer)*lfo;
            sample=std::clamp(sample,-0.32f,0.32f);
            musicBuffer[i*2]=(int16_t)(sample*30000.0f);
            musicBuffer[i*2+1]=(int16_t)((sample*0.985f)*30000.0f);
        }
        UpdateAudioStream(musicStream,musicBuffer.data(),frames);
        musicTime+=frames/sr;
    };
    auto Respawn=[&](){player=checkpoint;vy=0;grounded=true;timeLeft=std::max(0.0f,timeLeft-4);hitsTaken++;respawnFlash=.3f;};
    auto CrateBlocked=[&](Vector3 pos,int skip,const Vector3& size){
        float radius=std::max(size.x,size.z)*0.5f;
        for(const auto& b:walls)if(b.solid&&HitsBox(pos,radius,b.pos,b.size))return true;
        for(const auto& d:doors)if(!d.open&&HitsBox(pos,radius,d.pos,d.size))return true;
        for(size_t i=0;i<crates.size();i++)if((int)i!=skip){
            float other=std::max(crates[i].size.x,crates[i].size.z)*0.5f;
            if(HitsBox(pos,radius+other*.65f,crates[i].pos,crates[i].size))return true;
        }
        return false;
    };

    if(validateMode){
        bool ok=ValidateLevels();
        if(!validateMode){
            if(sceneTarget.id!=0)UnloadRenderTexture(sceneTarget);
            if(skyPhotoReady)UnloadTexture(skyPhoto);
            if(pbrReady)UnloadShader(pbrShader);
            if(musicReady){
                StopAudioStream(musicStream);
                UnloadAudioStream(musicStream);
            }
            CloseAudioDevice();
            EnableCursor();
            CloseWindow();
        }
        return ok?0:1;
    }

    while(!WindowShouldClose()){
        float dt=std::min(GetFrameTime(),.05f);
        if(musicReady && IsAudioStreamProcessed(musicStream)) FillMusic();
        bool click=IsMouseButtonPressed(MOUSE_BUTTON_LEFT);

        if(IsKeyPressed(KEY_F11)){
            if(IsWindowFullscreen()) ApplyDisplayMode(1);
            else ApplyDisplayMode(2);
            SaveGame(save);
        }

        if(screen==Screen::MENU){
            EnableCursor();
            Rectangle a{GetScreenWidth()/2.0f-170,350,340,52},b{GetScreenWidth()/2.0f-170,412,340,52},c{GetScreenWidth()/2.0f-170,474,340,52},e{GetScreenWidth()/2.0f-170,536,340,52},d{GetScreenWidth()/2.0f-170,598,340,52};
            if(IsKeyPressed(KEY_ENTER)||(CheckCollisionPointRec(GetMousePosition(),a)&&click))StartLevel(save.unlocked);
            else if(IsKeyPressed(KEY_L)||(CheckCollisionPointRec(GetMousePosition(),b)&&click))screen=Screen::LEVEL_SELECT;
            else if(IsKeyPressed(KEY_S)||(CheckCollisionPointRec(GetMousePosition(),c)&&click)){settingsReturn=Screen::MENU;screen=Screen::SETTINGS;}
            else if(CheckCollisionPointRec(GetMousePosition(),e)&&click)screen=Screen::CREDITS;
            else if(IsKeyPressed(KEY_ESCAPE)||(CheckCollisionPointRec(GetMousePosition(),d)&&click))break;
        } else if(screen==Screen::LEVEL_SELECT){
            EnableCursor();
            if(IsKeyPressed(KEY_ESCAPE))screen=Screen::MENU;
            cam.position=V3(0,5.0f,17.0f);
            cam.target=V3(0,3.2f,0);
            cam.up=V3(0,1,0);
            cam.fovy=58.0f;
            if(click){
                Vector2 m=GetMousePosition();
                for(int i=0;i<LEVELS;i++){
                    int n=i+1,col=i%10,row=i/10;
                    float wx=(col-4.5f)*1.25f;
                    float wy=7.4f-row*0.92f;
                    Vector2 p=GetWorldToScreen(V3(wx,wy,-0.5f),cam);
                    Rectangle r{p.x-32,p.y-22,64,44};
                    if(n<=save.unlocked&&CheckCollisionPointRec(m,r)){StartLevel(n);break;}
                }
            }
        } else if(screen==Screen::SETTINGS){
            EnableCursor();
            if(IsKeyPressed(KEY_ESCAPE)){SaveGame(save);screen=settingsReturn;}
            if(IsKeyPressed(KEY_TAB)||IsKeyPressed(KEY_S))settingsSelected=(settingsSelected+1)%10;
            if(IsKeyPressed(KEY_UP))settingsSelected=(settingsSelected+9)%10;
            if(IsKeyPressed(KEY_DOWN))settingsSelected=(settingsSelected+1)%10;
            int hoverRow=-1;
            for(int i=0;i<10;i++){
                Rectangle rr{60.0f,145.0f+i*64.0f,560.0f,54.0f};
                if(CheckCollisionPointRec(GetMousePosition(),rr))hoverRow=i;
            }
            if(click&&hoverRow>=0)settingsSelected=hoverRow;
            int dir=(IsKeyPressed(KEY_RIGHT)?1:0)-(IsKeyPressed(KEY_LEFT)?1:0);
            if(dir || (click&&hoverRow==settingsSelected)){
                if(settingsSelected==0)settings.sensitivity=Clamp(settings.sensitivity+dir*.0002f,.0008f,.005f);
                if(settingsSelected==1)settings.invertY=!settings.invertY;
                if(settingsSelected==2)settings.fov=Clamp(settings.fov+dir*2,60,100);
                if(settingsSelected==3)settings.hints=!settings.hints;
                if(settingsSelected==4)settings.shake=!settings.shake;
                if(settingsSelected==5)settings.uiScale=Clamp(settings.uiScale+dir*.05f,.85f,1.2f);
                if(settingsSelected==6)settings.crosshair=(settings.crosshair+(dir>0?1:2))%3;
                if(settingsSelected==7)ApplyDisplayMode((settings.displayMode+(dir>0?1:2))%3);
                if(settingsSelected==8)settings.performanceMonitor=!settings.performanceMonitor;
                if(settingsSelected==9){
                    static const int scales[6]={50,67,75,85,92,100};
                    int idx=0;
                    for(int i=0;i<6;i++)if(scales[i]==settings.renderScale)idx=i;
                    idx=std::clamp(idx+(dir>0?1:-1),0,5);
                    settings.renderScale=scales[idx];
                }
                SaveGame(save);
            }
        } else if(screen==Screen::PLAYING){
            if(IsKeyPressed(KEY_ESCAPE)){screen=Screen::PAUSED;EnableCursor();}
            if(IsKeyPressed(KEY_R)){StartLevel(level.number);continue;}
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

            bool movingNow=Vector3LengthSqr(m)>.01f;
            if(movingNow){
                m=Vector3Normalize(m);
                Vector3 step=Vector3Scale(m,speed*dt),next=Vector3Add(player,step);
                bool worldBlocked=false;
                for(const auto& b:walls)if(HitsBox(next,PLAYER_RADIUS,b.pos,b.size)){worldBlocked=true;break;}
                if(!worldBlocked)for(const auto& d:doors)if(!d.open&&HitsBox(next,PLAYER_RADIUS,d.pos,d.size)){worldBlocked=true;break;}

                int pushIndex=-1;
                if(!worldBlocked){
                    float nearest=1e9f;
                    for(int i=0;i<(int)crates.size();i++){
                        if(HitsBox(next,PLAYER_RADIUS+.15f,crates[i].pos,crates[i].size)){
                            float dist=Vector3DistanceSqr(player,crates[i].pos);
                            if(dist<nearest){nearest=dist;pushIndex=i;}
                        }
                    }
                }

                if(!worldBlocked&&pushIndex>=0){
                    auto& crate=crates[pushIndex];
                    Vector3 crateNext=Vector3Add(crate.pos,step);
                    if(!CrateBlocked(crateNext,pushIndex,crate.size)){
                        crate.pos=crateNext;
                        player=next;
                    }
                } else if(!worldBlocked){
                    player=next;
                }
            }

            if(movingNow){
                locomotionClock += dt*(sprint?11.0f:7.0f);
                float targetBob=(sprint?0.085f:0.045f)*sinf(locomotionClock)*sinf(locomotionClock*0.5f);
                cameraBob += (targetBob-cameraBob)*std::min(1.0f,dt*12.0f);
            }else{
                cameraBob += (0.0f-cameraBob)*std::min(1.0f,dt*10.0f);
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

            Vector3 exit=V3(0,1,-currentArenaHalf+2.0f);
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

            float sprintFov=settings.fov+(sprint?5.0f:0.0f);
            cam.position=Vector3Add(player,V3(0,.62f+cameraBob,0));
            cam.target=Vector3Add(cam.position,ViewDirection(yaw,pitch));
            cam.fovy=sprintFov;
        } else if(screen==Screen::PAUSED){
            EnableCursor();
            if(IsKeyPressed(KEY_ESCAPE)){screen=Screen::PLAYING;DisableCursor();}
            else if(IsKeyPressed(KEY_R))StartLevel(level.number);
            else if(IsKeyPressed(KEY_S)){settingsReturn=Screen::PAUSED;screen=Screen::SETTINGS;}
        } else if(screen==Screen::COMPLETE){
            EnableCursor();
            if(IsKeyPressed(KEY_ENTER)||click)screen=Screen::LEVEL_SELECT;
            if(IsKeyPressed(KEY_ESCAPE))screen=Screen::MENU;
        } else if(screen==Screen::CREDITS){
            EnableCursor();
            if(IsKeyPressed(KEY_ESCAPE)||click)screen=Screen::MENU;
        }

        BeginDrawing();
        ClearBackground(Color{5,9,16,255});

        if(screen==Screen::MENU){
            cam.position=V3(0,3.0f,10.5f);
            cam.target=V3(0,1.7f,0);
            cam.up=V3(0,1,0);
            cam.fovy=58.0f;

            BeginMode3D(cam);
            DrawPlane(V3(0,0,0),Vector2{30,30},Color{7,14,22,255});
            for(int i=-5;i<=5;i+=2)
                DrawCylinder(V3((float)i,1.5f,-2.0f),0.35f,0.65f,3.0f,16,Color{12,29,43,255});
            WorldFrame(cam,V3(0,2.9f,-0.5f),V3(8.8f,2.8f,0.45f),SKYBLUE);
            DrawSphere(V3(0,4.05f,-0.8f),0.55f,Color{38,128,170,255});

            float x=GetScreenWidth()/2.0f-170;
            Rectangle a{x,350,340,52},b{x,412,340,52},c{x,474,340,52},e{x,536,340,52},d{x,598,340,52};
            WorldButton(cam,V3(-3.0f,1.50f,0.0f),V3(4.6f,0.58f,0.42f),"CONTINUE",CheckCollisionPointRec(GetMousePosition(),a),SKYBLUE);
            WorldButton(cam,V3(3.0f,1.50f,0.0f),V3(4.6f,0.58f,0.42f),"FLOOR SELECT",CheckCollisionPointRec(GetMousePosition(),b),SKYBLUE);
            WorldButton(cam,V3(-3.0f,0.65f,0.0f),V3(4.6f,0.58f,0.42f),"SETTINGS",CheckCollisionPointRec(GetMousePosition(),c),SKYBLUE);
            WorldButton(cam,V3(3.0f,0.65f,0.0f),V3(4.6f,0.58f,0.42f),"CREDITS",CheckCollisionPointRec(GetMousePosition(),e),SKYBLUE);
            WorldButton(cam,V3(0.0f,-0.18f,0.0f),V3(4.6f,0.58f,0.42f),"QUIT",CheckCollisionPointRec(GetMousePosition(),d),SKYBLUE);

            Vector2 title=GetWorldToScreen(V3(0,2.9f,-0.82f),cam);
            DrawText("NEON VAULT",(int)title.x-145,(int)title.y-28,58,RAYWHITE);
            Vector2 sub=GetWorldToScreen(V3(0,2.2f,-0.82f),cam);
            DrawText("100-FLOOR CRYSTAL EXPEDITION",(int)sub.x-165,(int)sub.y,16,LIGHTGRAY);
            Vector2 progress=GetWorldToScreen(V3(0,-0.48f,0.0f),cam);
            DrawText(TextFormat("PROGRESS %03d / %03d",save.unlocked,LEVELS),(int)progress.x-115,(int)progress.y,18,LIGHTGRAY);
            EndMode3D();
        } else if(screen==Screen::LEVEL_SELECT){
            cam.position=V3(0,5.0f,17.0f);
            cam.target=V3(0,3.2f,0);
            cam.up=V3(0,1,0);
            cam.fovy=58.0f;

            BeginMode3D(cam);
            DrawPlane(V3(0,0,0),Vector2{34,34},Color{5,12,20,255});
            WorldFrame(cam,V3(0,4.2f,-0.8f),V3(13.5f,9.4f,0.5f),Color{70,205,255,255});

            for(int i=0;i<LEVELS;i++){
                int n=i+1,col=i%10,row=i/10;
                float wx=(col-4.5f)*1.25f;
                float wy=7.4f-row*0.92f;
                float wz=-0.25f;
                bool unlocked=n<=save.unlocked;
                bool hovered=false;
                Vector2 projected=GetWorldToScreen(V3(wx,wy,wz-0.25f),cam);
                Rectangle hit{projected.x-25,projected.y-20,50,40};
                hovered=CheckCollisionPointRec(GetMousePosition(),hit);
                Color accent=unlocked?ThemePrimary(i):Color{35,44,52,255};
                Color body=unlocked?(hovered?Color{24,50,66,255}:Color{12,28,40,255}):Color{9,16,23,255};
                DrawCube(V3(wx,wy,wz),1.0f,0.62f,0.35f,body);
                DrawCubeWires(V3(wx,wy,wz),1.0f,0.62f,0.35f,accent);
                Vector2 tp=GetWorldToScreen(V3(wx,wy,wz-0.22f),cam);
                DrawText(TextFormat("%02d",n),(int)tp.x-10,(int)tp.y-11,18,unlocked?RAYWHITE:DARKGRAY);
                DrawText(TextFormat("★%d",save.stars[n]),(int)tp.x-16,(int)tp.y+9,11,save.stars[n]?GOLD:Color{55,62,70,255});
            }

            Vector2 title=GetWorldToScreen(V3(0,8.4f,-1.15f),cam);
            DrawText("FLOOR SELECT",(int)title.x-112,(int)title.y-22,34,RAYWHITE);
            Vector2 status=GetWorldToScreen(V3(0,7.9f,-1.15f),cam);
            DrawText(TextFormat("%03d / %03d UNLOCKED",save.unlocked,LEVELS),(int)status.x-100,(int)status.y,14,LIGHTGRAY);
            EndMode3D();
        } else if(screen==Screen::SETTINGS){
            cam.position=V3(0,3.4f,11.5f);
            cam.target=V3(0,2.8f,0);
            cam.up=V3(0,1,0);
            cam.fovy=58.0f;

            BeginMode3D(cam);
            DrawPlane(V3(0,0,0),Vector2{28,28},Color{5,11,18,255});
            WorldFrame(cam,V3(0,3.5f,-0.9f),V3(12.0f,7.2f,0.55f),Color{70,205,255,255});

            const char* labels[10]={"Mouse sensitivity","Invert Y","Field of view","Hints","Screen shake","UI scale","Crosshair","Display mode","Performance monitor","Render scale"};
            const char* dm[3]={"WINDOWED","BORDERLESS","FULLSCREEN"};
            std::string vals[10]={
                TextFormat("%.4f",settings.sensitivity),settings.invertY?"ON":"OFF",
                TextFormat("%.0f",settings.fov),settings.hints?"ON":"OFF",
                settings.shake?"ON":"OFF",TextFormat("%.2fx",settings.uiScale),
                TextFormat("STYLE %d",settings.crosshair+1),dm[settings.displayMode],
                settings.performanceMonitor?"ON":"OFF",TextFormat("%d%%",settings.renderScale)
            };

            for(int i=0;i<10;i++){
                float wy=6.55f-i*0.61f;
                float wx=-2.0f;
                Vector2 pp=GetWorldToScreen(V3(wx,wy,-0.72f),cam);
                Rectangle hit{pp.x-235,pp.y-18,470,36};
                bool hot=i==settingsSelected||CheckCollisionPointRec(GetMousePosition(),hit);
                DrawCube(V3(wx,wy,-0.55f),6.2f,0.48f,0.32f,hot?Color{20,42,56,255}:Color{10,24,34,255});
                DrawCubeWires(V3(wx,wy,-0.55f),6.2f,0.48f,0.32f,hot?SKYBLUE:Color{42,58,72,255});
                Vector2 lp=GetWorldToScreen(V3(wx-2.35f,wy,-0.74f),cam);
                Vector2 vp=GetWorldToScreen(V3(wx+1.6f,wy,-0.74f),cam);
                DrawText(labels[i],(int)lp.x,(int)lp.y-10,16,RAYWHITE);
                DrawText(vals[i].c_str(),(int)vp.x,(int)vp.y-10,16,SKYBLUE);
            }

            Vector2 title=GetWorldToScreen(V3(0,7.15f,-1.2f),cam);
            DrawText("SETTINGS",(int)title.x-80,(int)title.y-22,34,RAYWHITE);
            Vector2 note=GetWorldToScreen(V3(0,0.25f,-0.8f),cam);
            DrawText("CLICK A ROW • ARROWS CHANGE • ESC BACK • F11 DISPLAY",(int)note.x-205,(int)note.y,13,LIGHTGRAY);
            EndMode3D();
        } else if(screen==Screen::PLAYING||screen==Screen::PAUSED){
            EnsureSceneTarget();
            BeginTextureMode(sceneTarget);
            ClearBackground(Color{5,9,16,255});
            BeginMode3D(cam);
            if(skyPhotoReady){
                DrawBillboard(cam,skyPhoto,V3(0,17.0f,-28.0f),18.0f,Color{255,255,255,245});
            }
            if(pbrReady){
                Vector3 lightPos=V3(6.0f,11.0f,2.0f);
                Vector3 lightColor=V3(1.0f,0.92f,0.78f);
                Vector3 ambient=V3(0.035f,0.045f,0.065f);
                float roughness=0.62f,metallic=0.08f;
                SetShaderValue(pbrShader,pbrViewPosLoc,&cam.position,SHADER_UNIFORM_VEC3);
                SetShaderValue(pbrShader,pbrLightPosLoc,&lightPos,SHADER_UNIFORM_VEC3);
                SetShaderValue(pbrShader,pbrLightColorLoc,&lightColor,SHADER_UNIFORM_VEC3);
                SetShaderValue(pbrShader,pbrAmbientLoc,&ambient,SHADER_UNIFORM_VEC3);
                SetShaderValue(pbrShader,pbrRoughnessLoc,&roughness,SHADER_UNIFORM_FLOAT);
                SetShaderValue(pbrShader,pbrMetallicLoc,&metallic,SHADER_UNIFORM_FLOAT);
                BeginShaderMode(pbrShader);
            }
            DrawPlane(V3(0,0,0),Vector2{24,24},Color{15,23,34,255});
            for(int i=-12;i<=12;i++){
                DrawLine3D(V3((float)i,.01f,-12),V3((float)i,.01f,12),Color{25,44,57,140});
                DrawLine3D(V3(-12,.01f,(float)i),V3(12,.01f,(float)i),Color{25,44,57,140});
            }
            visibleObjects=0;culledObjects=0;
            for(const auto& b:walls){
                float rr=0.5f*sqrtf(b.size.x*b.size.x+b.size.y*b.size.y+b.size.z*b.size.z);
                if(!InCameraFrustum(cam,b.pos,rr)){culledObjects++;continue;}
                visibleObjects++;
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
            for(const auto& c:crystals)if(!c.collected){
                if(!InCameraFrustum(cam,c.pos,0.55f)){culledObjects++;continue;}
                visibleObjects++;float bob=.16f*sinf((float)GetTime()*3+c.pos.x);Vector3 p=V3(c.pos.x,c.pos.y+bob,c.pos.z);DrawSphere(p,.28f,ThemePrimary(level.theme));DrawSphereWires(p,.37f,8,12,RAYWHITE);}
            for(const auto& p:pads){
                Color pc=p.active?GREEN:ThemePrimary(level.theme);
                if(memoryShowing&&p.id==MemoryWanted(level.number,memoryProgress,level.memoryLength))pc=WHITE;
                DrawCylinder(p.pos,.72f,.72f,.08f,4,pc);DrawCylinderWires(p.pos,.80f,.80f,.1f,4,RAYWHITE);
            }
            for(const auto& h:hazards){
                Vector3 p=h.pos;if(h.moving)p.x+=sinf((float)GetTime()*1.3f+h.phase)*4.5f;
                if(!InCameraFrustum(cam,p,1.8f)){culledObjects++;continue;}
                visibleObjects++;
                DrawCube(p,h.size.x,h.size.y,h.size.z,RED);DrawCubeWires(p,h.size.x,h.size.y,h.size.z,Color{255,120,120,255});
            }
            Vector3 exit=V3(0,.05f,-currentArenaHalf+2.0f);
            DrawCylinder(exit,1.5f,1.5f,.08f,40,puzzleSolved?GREEN:Color{50,100,125,255});
            DrawCylinderWires(exit,1.65f,1.65f,.1f,40,RAYWHITE);
            if(screen==Screen::PAUSED){
                if(pbrReady)EndShaderMode();
                Vector3 fwd=ViewDirection(yaw,pitch);
                Vector3 panel=Vector3Add(cam.position,Vector3Add(Vector3Scale(fwd,2.8f),V3(0,0.2f,0)));
                DrawCube(panel,6.0f,2.5f,0.45f,Color{7,18,28,240});
                DrawCubeWires(panel,6.15f,2.65f,0.55f,SKYBLUE);
                Vector2 pp=GetWorldToScreen(Vector3Add(panel,V3(0,0.45f,0)),cam);
                DrawText("PAUSED",(int)pp.x-60,(int)pp.y-30,34,RAYWHITE);
                DrawText("ESC RESUME",(int)pp.x-75,(int)pp.y+10,16,SKYBLUE);
                DrawText("R RESTART   S SETTINGS",(int)pp.x-110,(int)pp.y+34,14,LIGHTGRAY);
                if(timeLeft<=0)DrawText("TIME EXPIRED — R TO RESTART",(int)pp.x-125,(int)pp.y+58,13,ORANGE);
            }else if(pbrReady)EndShaderMode();
            EndMode3D();
            EndTextureMode();
            DrawTexturePro(sceneTarget.texture,
                Rectangle{0,0,(float)sceneTarget.texture.width,-(float)sceneTarget.texture.height},
                Rectangle{0,0,(float)GetScreenWidth(),(float)GetScreenHeight()},
                Vector2{0,0},0,WHITE);

            int collected=0;for(const auto& c:crystals)if(c.collected)collected++;
            Color accent=ThemePrimary(level.theme);
            // No permanent top panel: only small world-anchored status.
            Vector2 status=GetWorldToScreen(Vector3Add(player,V3(-0.8f,-0.25f,1.9f)),cam);
            DrawText(TextFormat("CRYSTALS %d/%d",collected,level.crystals),(int)status.x-100,(int)status.y,18,accent);
            Vector2 floorLabel=GetWorldToScreen(Vector3Add(player,V3(0.2f,-0.05f,1.9f)),cam);
            DrawText(TextFormat("FLOOR %03d",level.number),(int)floorLabel.x,(int)floorLabel.y,16,RAYWHITE);
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

            if(settings.performanceMonitor){
                Vector3 fwd=ViewDirection(yaw,pitch);
                Vector3 monitor=Vector3Add(cam.position,Vector3Add(Vector3Scale(fwd,2.1f),V3(0,0.75f,0.0f)));
                Vector2 mp=GetWorldToScreen(monitor,cam);
                DrawText(TextFormat("FPS %d",GetFPS()),(int)mp.x-92,(int)mp.y-42,14,RAYWHITE);
                DrawText(TextFormat("FRAME %.2f ms",GetFrameTime()*1000.0f),(int)mp.x-92,(int)mp.y-22,14,RAYWHITE);
                DrawText(TextFormat("VISIBLE %d  CULLED %d",visibleObjects,culledObjects),(int)mp.x-92,(int)mp.y-2,14,RAYWHITE);
                DrawText(dedicatedVRAMMB?TextFormat("VRAM %d MB",dedicatedVRAMMB):"VRAM N/A",(int)mp.x-92,(int)mp.y+18,14,RAYWHITE);
                DrawText(TextFormat("RENDER %dx%d",sceneTargetW,sceneTargetH),(int)mp.x-92,(int)mp.y+38,14,Color{170,190,205,255});
            }
            DrawText("ESC PAUSE • E INTERACT • R RESTART",34,GetScreenHeight()-24,14,GRAY);
            if(respawnFlash>0)DrawRectangle(0,0,GetScreenWidth(),GetScreenHeight(),Color{255,60,60,40});
        } else if(screen==Screen::COMPLETE){
            cam.position=V3(0,3.5f,12.5f); cam.target=V3(0,2.6f,0); cam.up=V3(0,1,0); cam.fovy=58.0f;
            BeginMode3D(cam);
            DrawPlane(V3(0,0,0),Vector2{28,28},Color{6,17,22,255});
            WorldFrame(cam,V3(0,3.3f,-1.0f),V3(10.5f,6.5f,0.5f),GREEN);
            Vector2 title=GetWorldToScreen(V3(0,5.1f,-1.25f),cam);
            DrawText("VAULT MASTER",(int)title.x-135,(int)title.y-24,48,GREEN);
            Vector2 sub=GetWorldToScreen(V3(0,4.2f,-1.25f),cam);
            int total=0;for(int i=1;i<=LEVELS;i++)total+=save.stars[i];
            DrawText("100 FLOORS COMPLETE",(int)sub.x-135,(int)sub.y,22,RAYWHITE);
            DrawText(TextFormat("TOTAL STARS  %d / %d",total,LEVELS*3),(int)sub.x-105,(int)sub.y+38,18,GOLD);
            DrawText("ENTER / CLICK • FLOOR SELECT",(int)sub.x-125,(int)sub.y+82,15,SKYBLUE);
            EndMode3D();
        } else if(screen==Screen::CREDITS){
            cam.position=V3(0,3.5f,12.5f); cam.target=V3(0,2.5f,0); cam.up=V3(0,1,0); cam.fovy=58.0f;
            BeginMode3D(cam);
            DrawPlane(V3(0,0,0),Vector2{28,28},Color{4,10,16,255});
            WorldFrame(cam,V3(0,3.2f,-1.0f),V3(11.0f,7.0f,0.5f),SKYBLUE);
            Vector2 t=GetWorldToScreen(V3(0,5.65f,-1.25f),cam);
            DrawText("CREDITS",(int)t.x-78,(int)t.y-22,34,RAYWHITE);
            Vector2 a2=GetWorldToScreen(V3(0,4.8f,-1.25f),cam);
            Vector2 b2=GetWorldToScreen(V3(0,4.1f,-1.25f),cam);
            Vector2 c2=GetWorldToScreen(V3(0,3.45f,-1.25f),cam);
            Vector2 d2=GetWorldToScreen(V3(0,2.8f,-1.25f),cam);
            DrawText("GAME DESIGN / PROGRAMMING",(int)a2.x-150,(int)a2.y,17,SKYBLUE);
            DrawText("Tamasrazim",(int)b2.x-55,(int)b2.y,28,RAYWHITE);
            DrawText("Native Windows 3D crystal adventure",(int)c2.x-150,(int)c2.y,16,LIGHTGRAY);
            DrawText("PBR baseline • procedural chill audio • 100 floors",(int)d2.x-190,(int)d2.y,15,LIGHTGRAY);
            Vector2 e2=GetWorldToScreen(V3(0,1.45f,-1.25f),cam);
            DrawText("ESC / CLICK TO RETURN",(int)e2.x-95,(int)e2.y,14,GRAY);
            EndMode3D();
        }

        EndDrawing();
    }

    SaveGame(save);
    if(sceneTarget.id != 0)UnloadRenderTexture(sceneTarget);
    if(pbrReady)UnloadShader(pbrShader);
    if(musicReady){
        StopAudioStream(musicStream);
        UnloadAudioStream(musicStream);
    }
    CloseAudioDevice();
    EnableCursor();
    CloseWindow();
    return 0;
}

from pathlib import Path

ROOT = Path("projects/razim-fps")
p = ROOT / "main.cpp"
s = p.read_text(encoding="utf-8")

def once(old, new):
    global s
    if old not in s:
        raise SystemExit(f"missing anchor: {old[:100]!r}")
    s = s.replace(old, new, 1)

once("#include <vector>\n",
"""#include <vector>
#if defined(_WIN32)
#include <windows.h>
#include <dxgi1_4.h>
#pragma comment(lib,"dxgi.lib")
#endif
""")

once("""    int crosshair = 0;
};""",
"""    int crosshair = 0;
    int displayMode = 1; // 0 windowed, 1 borderless, 2 fullscreen
    bool performanceMonitor = false;
};""")

once("""    c.crystals=3+std::min(3,tier/2);
    c.obstacles=3+tier*2+sub/2;
    c.hazards=tier==0?0:1+tier/2+sub/4;
    c.timeLimit=145.0f-tier*8.0f-sub*1.5f;""",
"""    // Floor 1 targets a real 10+ minute first run instead of tutorial pacing.
    c.crystals=8+std::min(7,tier+sub/2);
    c.obstacles=18+std::min(32,tier*3+sub);
    c.hazards=2+tier/2+sub/4;
    c.timeLimit=900.0f+std::min(900,tier*60);""")

once("""    if(n==100){c.puzzle=PuzzleType::FINALE;c.crystals=6;c.keys=2;c.switches=2;c.memoryLength=7;c.sequenceLength=8;c.obstacles=24;c.hazards=8;c.timeLimit=210;}""",
"""    if(n==100){c.puzzle=PuzzleType::FINALE;c.crystals=18;c.keys=3;c.switches=4;c.memoryLength=9;c.sequenceLength=10;c.obstacles=48;c.hazards=14;c.timeLimit=1800;}""")

once("""    o<<"crosshair "<<d.settings.crosshair<<"\\n";""",
"""    o<<"crosshair "<<d.settings.crosshair<<"\\n";
    o<<"displayMode "<<d.settings.displayMode<<"\\n";
    o<<"performanceMonitor "<<(d.settings.performanceMonitor?1:0)<<"\\n";""")

once("""        else if(k=="crosshair")in>>d.settings.crosshair;
""",
"""        else if(k=="crosshair")in>>d.settings.crosshair;
        else if(k=="displayMode")in>>d.settings.displayMode;
        else if(k=="performanceMonitor"){int v;in>>v;d.settings.performanceMonitor=v!=0;}
""")

once("""    d.settings.crosshair=std::clamp(d.settings.crosshair,0,2);
""",
"""    d.settings.crosshair=std::clamp(d.settings.crosshair,0,2);
    d.settings.displayMode=std::clamp(d.settings.displayMode,0,2);
""")

once("""static bool HitsBox(Vector3 p,float r,Vector3 c,Vector3 s){""",
"""static bool BoxesOverlapXZ(Vector3 a,Vector3 as,Vector3 b,Vector3 bs,float padding=0.0f){
    return fabsf(a.x-b.x) < (as.x+bs.x)*0.5f+padding &&
           fabsf(a.z-b.z) < (as.z+bs.z)*0.5f+padding;
}
static bool HitsBox(Vector3 p,float r,Vector3 c,Vector3 s){""")

once("""static Vector3 ViewDirection(float yaw,float pitch){""",
"""static bool InCameraFrustum(const Camera3D& cam,Vector3 p,float radius){
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
static int QueryDedicatedVRAMMB(){
#if defined(_WIN32)
    IDXGIFactory1* factory=nullptr;
    if(FAILED(CreateDXGIFactory1(__uuidof(IDXGIFactory1),(void**)&factory))) return 0;
    SIZE_T best=0;
    for(UINT i=0;;++i){
        IDXGIAdapter1* adapter=nullptr;
        if(factory->EnumAdapters1(i,&adapter)==DXGI_ERROR_NOT_FOUND) break;
        DXGI_ADAPTER_DESC1 desc{};
        adapter->GetDesc1(&desc);
        if(!(desc.Flags&DXGI_ADAPTER_FLAG_SOFTWARE))
            best=std::max(best,(SIZE_T)desc.DedicatedVideoMemory);
        adapter->Release();
    }
    factory->Release();
    return (int)(best/(1024*1024));
#else
    return 0;
#endif
}
static Vector3 ViewDirection(float yaw,float pitch){""")

once("""    Settings& settings=save.settings;
""",
"""    Settings& settings=save.settings;
    int dedicatedVRAMMB=QueryDedicatedVRAMMB();
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
    if(settings.displayMode!=0)ApplyDisplayMode(settings.displayMode);
""")

once("""        player=V3(0,1,10);checkpoint=player;yaw=PI;pitch=0;vy=0;stamina=100;""",
"""        float arenaHalf=21.0f+level.tier*0.25f;
        player=V3(0,1,arenaHalf-5);checkpoint=player;yaw=PI;pitch=0;vy=0;stamina=100;""")

once("""        walls.push_back({V3(0,.8f,-12.5f),V3(26,1.6f,1),true});
        walls.push_back({V3(0,.8f,12.5f),V3(26,1.6f,1),true});
        walls.push_back({V3(-12.5f,.8f,0),V3(1,1.6f,26),true});
        walls.push_back({V3(12.5f,.8f,0),V3(1,1.6f,26),true});""",
"""        walls.push_back({V3(0,.8f,-arenaHalf),V3(arenaHalf*2,1.6f,1),true});
        walls.push_back({V3(0,.8f, arenaHalf),V3(arenaHalf*2,1.6f,1),true});
        walls.push_back({V3(-arenaHalf,.8f,0),V3(1,1.6f,arenaHalf*2),true});
        walls.push_back({V3( arenaHalf,.8f,0),V3(1,1.6f,arenaHalf*2),true});""")

once("""        for(int i=0;i<level.obstacles;i++){
            float x=rnd(-9,9),z=rnd(-7.2f,7);
            if(fabsf(x)<2.4f&&z>4)z-=4;
            if(fabsf(x)<2.2f&&fabsf(z)<2.2f)x+=(x>=0?3.0f:-3.0f);
            walls.push_back({V3(x,1,z),V3(1.2f+rnd(0,2),2,1.2f+rnd(0,2.3f)),true});
        }""",
"""        for(int i=0;i<level.obstacles;i++){
            bool placed=false;
            for(int attempt=0;attempt<80&&!placed;attempt++){
                float x=rnd(-arenaHalf+2,arenaHalf-2),z=rnd(-arenaHalf+2,arenaHalf-2);
                if(fabsf(x)<3.0f&&z>arenaHalf-8) continue;
                Vector3 pos=V3(x,1,z),size=V3(1.5f+rnd(0,2.6f),2,1.5f+rnd(0,2.6f));
                bool blocked=false;
                for(const auto& b:walls) if(BoxesOverlapXZ(pos,size,b.pos,b.size,0.6f)){blocked=true;break;}
                if(!blocked){walls.push_back({pos,size,true});placed=true;}
            }
        }""")

once("""        for(int i=0;i<level.crystals;i++){
            float a=(float)i/level.crystals*(2.0f*PI)+n*.37f;
            float r=2.8f+(i%3)*2+level.tier*.25f;
            crystals.push_back({V3(cosf(a)*r,.85f,sinf(a)*r),false});
        }""",
"""        for(int i=0;i<level.crystals;i++){
            float a=(float)i/level.crystals*(2.0f*PI)+n*.37f;
            float r=4.5f+(i%5)*2.6f+level.tier*.35f;
            r=std::min(r,arenaHalf-3.0f);
            Vector3 cp=V3(cosf(a)*r,.85f,sinf(a)*r);
            bool safe=true;
            for(const auto& b:walls) if(HitsBox(cp,0.55f,b.pos,b.size)){safe=false;break;}
            if(!safe) cp=V3(((i%4)-1.5f)*3.3f,.85f,-((i/4)+1)*4.2f);
            crystals.push_back({cp,false});
        }""")

once("""    bool grounded=true,memoryShowing=false;""",
"""    bool grounded=true,memoryShowing=false;
    int visibleObjects=0,culledObjects=0;""")

once("""        if(screen==Screen::MENU){
            EnableCursor();""",
"""        if(IsKeyPressed(KEY_F11)){
            if(IsWindowFullscreen()) ApplyDisplayMode(1);
            else ApplyDisplayMode(2);
            SaveGame(save);
        }

        if(screen==Screen::MENU){
            EnableCursor();""")

once("""            if(IsKeyPressed(KEY_TAB)||IsKeyPressed(KEY_S))settingsSelected=(settingsSelected+1)%7;
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
            }""",
"""            if(IsKeyPressed(KEY_TAB)||IsKeyPressed(KEY_S))settingsSelected=(settingsSelected+1)%9;
            if(IsKeyPressed(KEY_UP))settingsSelected=(settingsSelected+8)%9;
            if(IsKeyPressed(KEY_DOWN))settingsSelected=(settingsSelected+1)%9;
            int hoverRow=-1;
            for(int i=0;i<9;i++){
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
                SaveGame(save);
            }""")

once('            DrawText("LEVEL SELECT",42,38,34,RAYWHITE);',
     '            DrawText("FLOOR SELECT",42,38,34,RAYWHITE);')

once("""            DrawText("SETTINGS",46,38,34,RAYWHITE);
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
            }""",
"""            DrawText("SETTINGS",46,38,34,RAYWHITE);
            DrawText("CLICK A ROW • ARROWS CHANGE • ESC SAVE + BACK • F11 DISPLAY",48,82,16,GRAY);
            const char* labels[9]={"Mouse sensitivity","Invert Y","Field of view","Hints","Screen shake","UI scale","Crosshair","Display mode","Performance monitor"};
            const char* dm[3]={"WINDOWED","BORDERLESS","FULLSCREEN"};
            std::string vals[9]={
                TextFormat("%.4f",settings.sensitivity),settings.invertY?"ON":"OFF",
                TextFormat("%.0f",settings.fov),settings.hints?"ON":"OFF",
                settings.shake?"ON":"OFF",TextFormat("%.2fx",settings.uiScale),
                TextFormat("STYLE %d",settings.crosshair+1),dm[settings.displayMode],
                settings.performanceMonitor?"ON":"OFF"
            };
            for(int i=0;i<9;i++){
                float y=145+i*64;Rectangle r{60,y,560,54};
                bool hot=i==settingsSelected||CheckCollisionPointRec(GetMousePosition(),r);
                DrawRectangleRounded(r,.18f,10,hot?Color{20,38,54,255}:Color{11,21,31,255});
                DrawRectangleRoundedLines(r,.18f,10,hot?SKYBLUE:Color{42,58,72,255});
                DrawText(labels[i],84,(int)y+16,19,RAYWHITE);
                DrawText(vals[i].c_str(),410,(int)y+16,18,SKYBLUE);
            }""")

once("""            DrawRectangle(0,0,GetScreenWidth(),74,Color{2,6,10,235});
            CrystalIcon({34,36},13,accent);DrawText(TextFormat("%d/%d",collected,level.crystals),52,23,24,RAYWHITE);
            ClockIcon({145,37},13,timeLeft<20?ORANGE:RAYWHITE);DrawText(TextFormat("%03.0f",timeLeft),165,23,24,timeLeft<20?ORANGE:RAYWHITE);
            DrawText(TextFormat("LEVEL %03d",level.number),GetScreenWidth()/2-65,22,24,accent);DrawText(PuzzleName(level.puzzle),GetScreenWidth()-170,26,16,GRAY);""",
"""            // No permanent top panel: only small world-anchored status.
            Vector2 status=GetWorldToScreen(Vector3Add(player,V3(-0.8f,-0.25f,1.9f)),cam);
            DrawText(TextFormat("CRYSTALS %d/%d",collected,level.crystals),(int)status.x-100,(int)status.y,18,accent);
            Vector2 floorLabel=GetWorldToScreen(Vector3Add(player,V3(0.2f,-0.05f,1.9f)),cam);
            DrawText(TextFormat("FLOOR %03d",level.number),(int)floorLabel.x,(int)floorLabel.y,16,RAYWHITE);""")

once("""            if(settings.hints){
                DrawRectangle(20,88,GetScreenWidth()-40,36,Color{4,10,16,200});
                DrawText(TextFormat("%s • Collect every crystal • Reach the green exit",PuzzleName(level.puzzle)),34,98,15,Color{175,200,215,255});
            }""",
"""            if(settings.performanceMonitor){
                DrawRectangle(GetScreenWidth()-300,14,286,132,Color{0,0,0,125});
                DrawText(TextFormat("FPS %d",GetFPS()),GetScreenWidth()-286,24,18,RAYWHITE);
                DrawText(TextFormat("FRAME %.2f ms",GetFrameTime()*1000.0f),GetScreenWidth()-286,47,18,RAYWHITE);
                DrawText(TextFormat("VISIBLE %d",visibleObjects),GetScreenWidth()-286,70,18,RAYWHITE);
                DrawText(TextFormat("CULLED %d",culledObjects),GetScreenWidth()-286,93,18,RAYWHITE);
                if(dedicatedVRAMMB)DrawText(TextFormat("VRAM %d MB",dedicatedVRAMMB),GetScreenWidth()-286,116,18,RAYWHITE);
                else DrawText("VRAM N/A",GetScreenWidth()-286,116,18,GRAY);
            }""")

once("""            for(const auto& b:walls){
                Color c=b.moving?Color{55,30,85,255}:Color{31,48,67,255};""",
"""            visibleObjects=0;culledObjects=0;
            for(const auto& b:walls){
                float rr=0.5f*sqrtf(b.size.x*b.size.x+b.size.y*b.size.y+b.size.z*b.size.z);
                if(!InCameraFrustum(cam,b.pos,rr)){culledObjects++;continue;}
                visibleObjects++;
                Color c=b.moving?Color{55,30,85,255}:Color{31,48,67,255};""")

once("""            for(const auto& c:crystals)if(!c.collected){""",
"""            for(const auto& c:crystals)if(!c.collected){
                if(!InCameraFrustum(cam,c.pos,0.55f)){culledObjects++;continue;}
                visibleObjects++;""")

once("""            for(const auto& h:hazards){
                Vector3 p=h.pos;if(h.moving)p.x+=sinf((float)GetTime()*1.3f+h.phase)*4.5f;""",
"""            for(const auto& h:hazards){
                Vector3 p=h.pos;if(h.moving)p.x+=sinf((float)GetTime()*1.3f+h.phase)*4.5f;
                if(!InCameraFrustum(cam,p,1.8f)){culledObjects++;continue;}
                visibleObjects++;""")

p.write_text(s, encoding="utf-8")
print("patched", p, "bytes", len(s.encode("utf-8")))

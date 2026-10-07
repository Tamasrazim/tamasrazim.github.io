#include <algorithm>
#if defined(_WIN32)
#define NOMINMAX
#include <windows.h>
#include <dxgi1_4.h>
#pragma comment(lib, "dxgi.lib")
#endif

int QueryDedicatedVRAMMB(){
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

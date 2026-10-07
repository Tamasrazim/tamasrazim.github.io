#include <algorithm>
#if defined(_WIN32)
#define NOMINMAX
#include <windows.h>
#include <dxgi1_4.h>
#pragma comment(lib, "dxgi.lib")
#endif

void EnsureWorkingDirectory(){
    wchar_t buffer[32768]{};
    DWORD n=GetModuleFileNameW(nullptr,buffer,32768);
    if(n==0 || n>=32768)return;
    while(n>0 && buffer[n-1]!=L'\\' && buffer[n-1]!=L'/')--n;
    if(n==0)return;
    buffer[n]=L'\0';
    SetCurrentDirectoryW(buffer);
}

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

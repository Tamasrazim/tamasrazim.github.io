#define UNICODE
#define _UNICODE
#define NOMINMAX
#include <windows.h>
#include <winhttp.h>
#include <shellapi.h>
#include <string>
#include <vector>
#include <algorithm>

#pragma comment(lib, "winhttp.lib")
#pragma comment(lib, "shell32.lib")

#ifndef NEO_BUILD
#define NEO_BUILD 0
#endif

static std::wstring GetExeDirectory(){
    wchar_t buffer[MAX_PATH]{};
    DWORD n=GetModuleFileNameW(nullptr,buffer,MAX_PATH);
    if(!n) return L".";
    std::wstring p(buffer,n);
    size_t slash=p.find_last_of(L"\\/");
    return slash==std::wstring::npos?L".":p.substr(0,slash);
}

static std::wstring Widen(const std::string& s){
    if(s.empty()) return {};
    int n=MultiByteToWideChar(CP_UTF8,0,s.data(),(int)s.size(),nullptr,0);
    std::wstring out(n,L'\0');
    MultiByteToWideChar(CP_UTF8,0,s.data(),(int)s.size(),out.data(),n);
    return out;
}

static bool HttpGet(const std::wstring& host,const std::wstring& path,std::vector<unsigned char>& out){
    HINTERNET session=WinHttpOpen(L"NEO-Updater/1.0",
        WINHTTP_ACCESS_TYPE_AUTOMATIC_PROXY,WINHTTP_NO_PROXY_NAME,WINHTTP_NO_PROXY_BYPASS,0);
    if(!session) return false;
    HINTERNET connect=WinHttpConnect(session,host.c_str(),INTERNET_DEFAULT_HTTPS_PORT,0);
    if(!connect){WinHttpCloseHandle(session);return false;}
    HINTERNET request=WinHttpOpenRequest(connect,L"GET",path.c_str(),nullptr,
        WINHTTP_NO_REFERER,WINHTTP_DEFAULT_ACCEPT_TYPES,WINHTTP_FLAG_SECURE);
    if(!request){WinHttpCloseHandle(connect);WinHttpCloseHandle(session);return false;}
    WinHttpAddRequestHeaders(request,L"Accept: application/vnd.github+json\r\nUser-Agent: NEO-Updater\r\n",-1,WINHTTP_ADDREQ_FLAG_ADD);
    bool ok=WinHttpSendRequest(request,WINHTTP_NO_ADDITIONAL_HEADERS,0,nullptr,0,0,0) &&
            WinHttpReceiveResponse(request,nullptr);
    if(ok){
        DWORD status=0,size=sizeof(status);
        WinHttpQueryHeaders(request,WINHTTP_QUERY_STATUS_CODE|WINHTTP_QUERY_FLAG_NUMBER,
            WINHTTP_HEADER_NAME_BY_INDEX,&status,&size,WINHTTP_NO_HEADER_INDEX);
        if(status!=200) ok=false;
    }
    if(ok){
        DWORD available=0;
        while(WinHttpQueryDataAvailable(request,&available) && available){
            size_t old=out.size();
            out.resize(old+available);
            DWORD got=0;
            if(!WinHttpReadData(request,out.data()+old,available,&got)){ok=false;break;}
            out.resize(old+got);
            if(got==0)break;
        }
    }
    WinHttpCloseHandle(request);
    WinHttpCloseHandle(connect);
    WinHttpCloseHandle(session);
    return ok;
}

static bool HttpDownload(const std::wstring& host,const std::wstring& path,const std::wstring& destination){
    std::vector<unsigned char> bytes;
    if(!HttpGet(host,path,bytes)||bytes.empty()) return false;
    HANDLE file=CreateFileW(destination.c_str(),GENERIC_WRITE,0,nullptr,CREATE_ALWAYS,FILE_ATTRIBUTE_NORMAL,nullptr);
    if(file==INVALID_HANDLE_VALUE) return false;
    DWORD written=0;
    bool ok=WriteFile(file,bytes.data(),(DWORD)bytes.size(),&written,nullptr) && written==bytes.size();
    CloseHandle(file);
    return ok;
}

static std::string JsonStringValue(const std::string& json,const std::string& key,size_t from=0){
    std::string needle="\""+key+"\":\"";
    size_t p=json.find(needle,from);
    if(p==std::string::npos)return {};
    p+=needle.size();
    std::string out;
    bool escape=false;
    for(;p<json.size();++p){
        char c=json[p];
        if(escape){out+=c;escape=false;}
        else if(c=='\\')escape=true;
        else if(c=='"')break;
        else out+=c;
    }
    return out;
}

static int ReleaseBuild(const std::string& tag){
    const std::string prefix="neo-";
    if(tag.rfind(prefix,0)!=0)return 0;
    try{return std::max(0,std::stoi(tag.substr(prefix.size())));}
    catch(...){return 0;}
}

static int LaunchGame(bool safeMode=false,unsigned long waitMs=0){
    std::wstring dir=GetExeDirectory();
    std::wstring exe=dir+L"\\neo.exe";
    std::wstring cmd=L"\""+exe+L"\"";
    if(safeMode)cmd+=L" --safe-mode";
    std::vector<wchar_t> cmdline(cmd.begin(),cmd.end());
    cmdline.push_back(L'\0');
    STARTUPINFOW si{};si.cb=sizeof(si);
    PROCESS_INFORMATION pi{};
    if(!CreateProcessW(nullptr,cmdline.data(),nullptr,nullptr,FALSE,0,nullptr,dir.c_str(),&si,&pi))return -1;
    if(waitMs){
        DWORD waited=WaitForSingleObject(pi.hProcess,waitMs);
        if(waited==WAIT_OBJECT_0){
            DWORD code=1;GetExitCodeProcess(pi.hProcess,&code);
            CloseHandle(pi.hThread);CloseHandle(pi.hProcess);
            return code==0?0:static_cast<int>(code);
        }
    }
    CloseHandle(pi.hThread);
    CloseHandle(pi.hProcess);
    return 1;
}

int main(){
    std::vector<unsigned char> api;
    if(HttpGet(L"api.github.com",L"/repos/Tamasrazim/tamasrazim.github.io/releases/latest",api)){
        std::string json(api.begin(),api.end());
        std::string tag=JsonStringValue(json,"tag_name");
        int latest=ReleaseBuild(tag);
        if(latest>NEO_BUILD){
            size_t asset=json.find("\"name\":\"NEO-Setup.exe\"");
            if(asset!=std::string::npos){
                std::string url=JsonStringValue(json,"browser_download_url",asset);
                const std::string prefix="https://github.com/Tamasrazim/tamasrazim.github.io/releases/download/";
                if(url.rfind(prefix,0)==0){
                    std::string tail=url.substr(prefix.size());
                    size_t slash=tail.find('/');
                    if(slash!=std::string::npos){
                        std::wstring path=Widen("/"+tail);
                        wchar_t temp[MAX_PATH]{};
                        GetTempPathW(MAX_PATH,temp);
                        std::wstring installer=std::wstring(temp)+L"NEO-Setup-update.exe";
                        if(HttpDownload(L"github.com",path,installer)){
                            SHELLEXECUTEINFOW sei{sizeof(sei)};
                            sei.lpVerb=L"open";
                            sei.lpFile=installer.c_str();
                            sei.lpParameters=L"/VERYSILENT /NORESTART /CLOSEAPPLICATIONS /SP-";
                            sei.nShow=SW_SHOWNORMAL;
                            if(ShellExecuteExW(&sei)) return 0;
                            DeleteFileW(installer.c_str());
                        }
                    }
                }
            }
        }
    }
    const int normal=LaunchGame(false,15000);
    if(normal==0||normal==1)return 0;
    return LaunchGame(true,0)>=0?0:1;
}

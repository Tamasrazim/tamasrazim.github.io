cmake_minimum_required(VERSION 3.21)
project(neon_vault LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>")

include(FetchContent)

set(BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
set(BUILD_GAMES OFF CACHE BOOL "" FORCE)
set(BUILD_SHARED_LIBS OFF CACHE BOOL "" FORCE)

FetchContent_Declare(
    raylib
    URL https://github.com/raysan5/raylib/archive/refs/tags/5.5.tar.gz
    DOWNLOAD_EXTRACT_TIMESTAMP TRUE
)
FetchContent_MakeAvailable(raylib)

add_executable(neon_vault WIN32 main.cpp)
target_link_libraries(neon_vault PRIVATE raylib)

if (MSVC)
    target_compile_options(neon_vault PRIVATE /W4 /permissive-)
    target_link_options(neon_vault PRIVATE "/SUBSYSTEM:WINDOWS" "/ENTRY:mainCRTStartup")
else()
    target_compile_options(neon_vault PRIVATE -Wall -Wextra -Wpedantic)
endif()

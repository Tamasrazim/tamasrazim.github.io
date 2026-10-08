
cmake_minimum_required(VERSION 3.21)
project(neo LANGUAGES C CXX RC)

set(NEO_BUILD "0" CACHE STRING "Build number")
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>")

include(FetchContent)
set(BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
set(BUILD_GAMES OFF CACHE BOOL "" FORCE)
set(BUILD_SHARED_LIBS OFF CACHE BOOL "" FORCE)

FetchContent_Declare(
  raylib
  URL https://github.com/raysan5/raylib/archive/refs/tags/6.0.tar.gz
  DOWNLOAD_EXTRACT_TIMESTAMP TRUE
)
FetchContent_MakeAvailable(raylib)

add_executable(neo main.cpp platform_win.cpp neon-vault.rc)
add_executable(neo_updater updater.cpp)

target_compile_definitions(neo_updater PRIVATE NEO_BUILD=${NEO_BUILD})
target_link_libraries(neo PRIVATE raylib dxgi)
target_link_libraries(neo_updater PRIVATE winhttp shell32)

if(MSVC)
  target_compile_definitions(neo PRIVATE _CRT_SECURE_NO_WARNINGS)
  target_compile_options(neo PRIVATE /W4 /permissive-)
  target_link_options(neo PRIVATE /SUBSYSTEM:WINDOWS /ENTRY:mainCRTStartup)
  target_link_options(neo_updater PRIVATE /SUBSYSTEM:WINDOWS /ENTRY:mainCRTStartup)
else()
  target_compile_options(neo PRIVATE -Wall -Wextra -Wpedantic)
endif()

add_custom_command(TARGET neo POST_BUILD
  COMMAND ${CMAKE_COMMAND} -E copy_directory
    "${CMAKE_CURRENT_SOURCE_DIR}/assets"
    "$<TARGET_FILE_DIR:neo>/assets"
)

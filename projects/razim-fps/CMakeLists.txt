
cmake_minimum_required(VERSION 3.21)
project(neon_vault LANGUAGES C CXX RC)

set(NEON_VAULT_BUILD "0" CACHE STRING "Build number")
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

add_executable(neon_vault main.cpp platform_win.cpp neon-vault.rc)
add_executable(neon_vault_updater updater.cpp)

target_compile_definitions(neon_vault_updater PRIVATE NEON_VAULT_BUILD=\${NEON_VAULT_BUILD})
target_link_libraries(neon_vault PRIVATE raylib dxgi)
target_link_libraries(neon_vault_updater PRIVATE winhttp shell32)

if(MSVC)
  target_compile_options(neon_vault PRIVATE /W4 /permissive-)
  target_link_options(neon_vault PRIVATE /SUBSYSTEM:WINDOWS /ENTRY:mainCRTStartup)
  target_link_options(neon_vault_updater PRIVATE /SUBSYSTEM:WINDOWS /ENTRY:mainCRTStartup)
else()
  target_compile_options(neon_vault PRIVATE -Wall -Wextra -Wpedantic)
endif()

add_custom_command(TARGET neon_vault POST_BUILD
  COMMAND \${CMAKE_COMMAND} -E copy_directory
    "\${CMAKE_CURRENT_SOURCE_DIR}/assets"
    "\$<TARGET_FILE_DIR:neon_vault>/assets"
)

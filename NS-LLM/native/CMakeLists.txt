cmake_minimum_required(VERSION 3.12)
project(ns-llm-native LANGUAGES CXX)

option(PROTOTYPE_ONLY "Build without ONNX runtime, run in stub mode" ON)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Read top-level version-id.txt (if present) and configure a header with the version.
if(EXISTS "${CMAKE_SOURCE_DIR}/../../version-id.txt")
  file(READ "${CMAKE_SOURCE_DIR}/../../version-id.txt" _ver)
  string(STRIP "${_ver}" PROJECT_VERSION)
else()
  set(PROJECT_VERSION "0.1.0")
endif()

configure_file(${CMAKE_SOURCE_DIR}/version.h.in ${CMAKE_CURRENT_BINARY_DIR}/version.h @ONLY)

add_executable(ns-llm-native src/main.cpp)

target_include_directories(ns-llm-native PRIVATE ${CMAKE_CURRENT_BINARY_DIR})

if(NOT PROTOTYPE_ONLY)
  message(STATUS "PROTOTYPE_ONLY=OFF - looking for ONNX Runtime (C++ libs and headers)")

  # Try an explicit environment variable first
  if(DEFINED ENV{ONNXRUNTIME_DIR})
    set(ONNXRUNTIME_ROOT $ENV{ONNXRUNTIME_DIR})
    message(STATUS "ONNXRUNTIME_DIR environment variable set: ${ONNXRUNTIME_ROOT}")
  endif()

  # Find headers
  find_path(ONNXRUNTIME_INCLUDE
    NAMES onnxruntime_cxx_api.h
    PATHS ${ONNXRUNTIME_ROOT}
    PATH_SUFFIXES include include/onnxruntime include/onnxruntime_cxx
  )

  # Find library
  find_library(ONNXRUNTIME_LIB
    NAMES onnxruntime onnxruntime_providers_shared
    PATHS ${ONNXRUNTIME_ROOT}
    PATH_SUFFIXES lib lib64 bin
  )

  if(ONNXRUNTIME_INCLUDE AND ONNXRUNTIME_LIB)
    message(STATUS "Found ONNX Runtime: include=${ONNXRUNTIME_INCLUDE} lib=${ONNXRUNTIME_LIB}")
    target_include_directories(ns-llm-native PRIVATE ${ONNXRUNTIME_INCLUDE})
    target_link_libraries(ns-llm-native PRIVATE ${ONNXRUNTIME_LIB})
    target_compile_definitions(ns-llm-native PRIVATE ONNXRUNTIME_FOUND=1)
  else()
    message(WARNING "ONNX Runtime not found. The binary will be built but without inference support (use --stub or install ONNXRUNTIME_DIR)")
  endif()
endif()

# optionally enable lto for release builds
if(CMAKE_BUILD_TYPE STREQUAL "Release")
  include(CheckIPOSupported)
  check_ipo_supported(RESULT lto_supported)
  if(lto_supported)
    set_target_properties(ns-llm-native PROPERTIES INTERPROCEDURAL_OPTIMIZATION TRUE)
  endif()
endif()

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const cmakePath = resolve(process.cwd(), 'node_modules/react-native-libsodium/android/CMakeLists.txt');

if (!existsSync(cmakePath)) {
  console.log('react-native-libsodium is not installed; skipping its Windows CMake patch.');
  process.exit(0);
}

const original = readFileSync(cmakePath, 'utf8');
if (!original.includes('react-native-libsodium.cpp')) {
  throw new Error(`Unexpected react-native-libsodium CMake file: ${cmakePath}`);
}

const patched = `cmake_minimum_required(VERSION 3.4.1)
project(react_native_libsodium)

set(CMAKE_VERBOSE_MAKEFILE ON)
set(CMAKE_CXX_STANDARD 20)

# CMake treats backslashes in quoted Windows paths as escapes (for example, \\U).
# Normalize the paths injected by Gradle before using them in source-file arguments.
file(TO_CMAKE_PATH "${'${NODE_MODULES_DIR}'}" MIRAGE_NODE_MODULES_DIR)
file(TO_CMAKE_PATH "${'${CMAKE_CURRENT_LIST_DIR}'}" MIRAGE_LIBSODIUM_MODULE_DIR)

include_directories(
  "${'${MIRAGE_LIBSODIUM_MODULE_DIR}'}/../cpp"
  "${'${MIRAGE_NODE_MODULES_DIR}'}/react-native/React"
  "${'${MIRAGE_NODE_MODULES_DIR}'}/react-native/React/Base"
  "${'${MIRAGE_NODE_MODULES_DIR}'}/react-native/ReactCommon/jsi"
)

set(LIBSODIUM_BUILD_DIR "${'${MIRAGE_LIBSODIUM_MODULE_DIR}'}/../libsodium/build")
if ("${'${ANDROID_ABI}'}" STREQUAL "arm64-v8a")
  set(LIBSODIUM_BUILD_DIR "${'${LIBSODIUM_BUILD_DIR}'}/libsodium-android-armv8-a+crypto")
elseif("${'${ANDROID_ABI}'}" STREQUAL "armeabi-v7a")
  set(LIBSODIUM_BUILD_DIR "${'${LIBSODIUM_BUILD_DIR}'}/libsodium-android-armv7-a")
elseif("${'${ANDROID_ABI}'}" STREQUAL "x86")
  set(LIBSODIUM_BUILD_DIR "${'${LIBSODIUM_BUILD_DIR}'}/libsodium-android-i686")
else()
  set(LIBSODIUM_BUILD_DIR "${'${LIBSODIUM_BUILD_DIR}'}/libsodium-android-westmere")
endif()

add_library(sodium SHARED IMPORTED)
include_directories("${'${LIBSODIUM_BUILD_DIR}'}/include/")
set_target_properties(sodium PROPERTIES IMPORTED_LOCATION "${'${LIBSODIUM_BUILD_DIR}'}/lib/libsodium.so")

add_library(libsodium SHARED
  "${'${MIRAGE_NODE_MODULES_DIR}'}/react-native/ReactCommon/jsi/jsi/jsi.cpp"
  "${'${MIRAGE_LIBSODIUM_MODULE_DIR}'}/../cpp/react-native-libsodium.cpp"
  "${'${MIRAGE_LIBSODIUM_MODULE_DIR}'}/../cpp/react-native-libsodium.h"
  "${'${MIRAGE_LIBSODIUM_MODULE_DIR}'}/cpp-adapter.cpp"
)

target_link_options(libsodium PRIVATE "-Wl,-z,max-page-size=16384")
target_link_libraries(libsodium sodium)
`;

if (original !== patched) writeFileSync(cmakePath, patched, 'utf8');
console.log(`Patched react-native-libsodium CMake paths for Windows: ${cmakePath}`);

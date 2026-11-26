export interface AndroidSourceFile {
  path: string;
  language: 'kotlin' | 'cpp' | 'xml' | 'gradle' | 'cmake';
  description: string;
  content: string;
}

export const ANDROID_SDK_PROJECT_FILES: AndroidSourceFile[] = [
  {
    path: 'settings.gradle.kts',
    language: 'gradle',
    description: 'Configuração raiz do Gradle para projeto Android nativo.',
    content: `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "FamiLinkNativeAndroid"
include(":app")
`,
  },
  {
    path: 'app/build.gradle.kts',
    language: 'gradle',
    description: 'Dependências Android SDK nativas (Jetpack Compose, NDK CMake, Firebase Auth + Firestore — sem WebView).',
    content: `plugins {
    id("com.android.application") version "8.5.2"
    id("org.jetbrains.kotlin.android") version "2.0.0"
    id("org.jetbrains.kotlin.plugin.compose") version "2.0.0"
    id("com.google.gms.google-services") version "4.4.2"
}

android {
    namespace = "com.familink.emulator"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.familink.emulator"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"

        ndk {
            abiFilters += listOf("arm64-v8a", "armeabi-v7a", "x86_64")
        }
    }

    externalNativeBuild {
        cmake {
            path = file("src/main/cpp/CMakeLists.txt")
        }
    }

    buildFeatures {
        compose = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation(platform("androidx.compose:compose-bom:2024.09.03"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.6")

    // Firebase Auth + Firestore (Conectado ao banco ai-studio-9b47464d-83f5-4195-ab77-803c3474f722)
    implementation(platform("com.google.firebase:firebase-bom:33.5.1"))
    implementation("com.google.firebase:firebase-auth-ktx")
    implementation("com.google.firebase:firebase-firestore-ktx")

    // WebSocket nativo para Netplay à distância / local
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
}
`,
  },
  {
    path: 'app/src/main/AndroidManifest.xml',
    language: 'xml',
    description: 'Manifesto Android nativo (sem WebView, com suporte a Gamepad e Internet).',
    content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.BLUETOOTH" />
    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
    <uses-feature android:name="android.hardware.gamepad" android:required="false" />

    <application
        android:allowBackup="true"
        android:label="FamiLink Nativo"
        android:theme="@android:style/Theme.Material.NoActionBar">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|screenSize|keyboardHidden">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
`,
  },
  {
    path: 'app/src/main/java/com/familink/emulator/CoreRegistry.kt',
    language: 'kotlin',
    description: 'Registro de todos os núcleos clássicos no Android SDK (exclui consoles Sony).',
    content: `package com.familink.emulator

data class AndroidCoreSpec(
    val id: String,
    val consoleName: String,
    val extensions: List<String>,
    val nativeSoName: String,
    val buildbotZipUrl: String
)

object CoreRegistry {
    private val sonyBlocked = setOf(".pbp", ".cso", ".iso", ".ecm", ".mdf", ".psx", ".vpk")

    val cores: List<AndroidCoreSpec> = listOf(
        AndroidCoreSpec("nes", "NES / Famicom", listOf(".nes"), "fceumm_libretro_android.so", "https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/fceumm_libretro_android.so.zip"),
        AndroidCoreSpec("fds", "Famicom Disk System", listOf(".fds"), "nestopia_libretro_android.so", "https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/nestopia_libretro_android.so.zip"),
        AndroidCoreSpec("snes", "Super Nintendo (SNES)", listOf(".sfc", ".smc"), "snes9x_libretro_android.so", "https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/snes9x_libretro_android.so.zip"),
        AndroidCoreSpec("gb", "Game Boy", listOf(".gb"), "gambatte_libretro_android.so", "https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/gambatte_libretro_android.so.zip"),
        AndroidCoreSpec("gbc", "Game Boy Color", listOf(".gbc"), "gambatte_libretro_android.so", "https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/gambatte_libretro_android.so.zip"),
        AndroidCoreSpec("gba", "Game Boy Advance", listOf(".gba"), "mgba_libretro_android.so", "https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/mgba_libretro_android.so.zip"),
        AndroidCoreSpec("vb", "Virtual Boy", listOf(".vb", ".vboy"), "mednafen_vb_libretro_android.so", "https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/mednafen_vb_libretro_android.so.zip"),
        AndroidCoreSpec("gw", "Game & Watch", listOf(".mgw"), "gw_libretro_android.so", "https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/gw_libretro_android.so.zip"),
        AndroidCoreSpec("megadrive", "Mega Drive / Genesis", listOf(".md", ".gen", ".smd", ".bin"), "genesis_plus_gx_libretro_android.so", "https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/genesis_plus_gx_libretro_android.so.zip"),
        AndroidCoreSpec("sega32x", "Sega 32X", listOf(".32x"), "picodrive_libretro_android.so", "https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/picodrive_libretro_android.so.zip"),
        AndroidCoreSpec("segacd", "Sega CD / Mega-CD", listOf(".chd", ".cue"), "genesis_plus_gx_libretro_android.so", "https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/genesis_plus_gx_libretro_android.so.zip"),
        AndroidCoreSpec("mastersystem", "Master System", listOf(".sms"), "genesis_plus_gx_libretro_android.so", "https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/genesis_plus_gx_libretro_android.so.zip"),
        AndroidCoreSpec("gamegear", "Game Gear", listOf(".gg"), "genesis_plus_gx_libretro_android.so", "https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/genesis_plus_gx_libretro_android.so.zip"),
        AndroidCoreSpec("sg1000", "Sega SG-1000", listOf(".sg"), "genesis_plus_gx_libretro_android.so", "https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/genesis_plus_gx_libretro_android.so.zip"),
        AndroidCoreSpec("pce", "PC Engine / TurboGrafx-16", listOf(".pce", ".sgx"), "mednafen_pce_fast_libretro_android.so", "https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/mednafen_pce_fast_libretro_android.so.zip"),
        AndroidCoreSpec("ngp", "Neo Geo Pocket", listOf(".ngp", ".ngc"), "mednafen_ngp_libretro_android.so", "https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/mednafen_ngp_libretro_android.so.zip"),
        AndroidCoreSpec("arcade", "Arcade / CPS1-3 (FBNeo)", listOf(".zip"), "fbneo_libretro_android.so", "https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/fbneo_libretro_android.so.zip"),
        AndroidCoreSpec("arcade2000", "Arcade 2000", listOf(".zip"), "mame2000_libretro_android.so", "https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/mame2000_libretro_android.so.zip"),
        AndroidCoreSpec("arcade2003", "Arcade 2003", listOf(".zip"), "mame2003_libretro_android.so", "https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/mame2003_libretro_android.so.zip"),
        AndroidCoreSpec("arcade2003plus", "Arcade 2003 Plus", listOf(".zip"), "mame2003_plus_libretro_android.so", "https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/mame2003_plus_libretro_android.so.zip"),
        AndroidCoreSpec("arcade2010", "Arcade 2010", listOf(".zip"), "mame2010_libretro_android.so", "https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/mame2010_libretro_android.so.zip"),
        AndroidCoreSpec("arcade2013", "Arcade 2013", listOf(".zip"), "fbalpha2012_libretro_android.so", "https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/fbalpha2012_libretro_android.so.zip"),
        AndroidCoreSpec("arcade2013plus", "Arcade 2013 Plus", listOf(".zip"), "mame2015_libretro_android.so", "https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/mame2015_libretro_android.so.zip"),
        AndroidCoreSpec("neogeo", "Neo Geo AES/MVS/CD", listOf(".neo", ".zip"), "fbneo_libretro_android.so", "https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/fbneo_libretro_android.so.zip"),
        AndroidCoreSpec("lynx", "Atari Lynx", listOf(".lnx"), "handy_libretro_android.so", "https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/handy_libretro_android.so.zip"),
        AndroidCoreSpec("wonderswan", "WonderSwan / Color", listOf(".ws", ".wsc"), "mednafen_wswan_libretro_android.so", "https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/mednafen_wswan_libretro_android.so.zip"),
        AndroidCoreSpec("colecovision", "ColecoVision", listOf(".col"), "gearcoleco_libretro_android.so", "https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/gearcoleco_libretro_android.so.zip"),
        AndroidCoreSpec("vectrex", "GCE Vectrex", listOf(".vec"), "vecx_libretro_android.so", "https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/vecx_libretro_android.so.zip"),
        AndroidCoreSpec("odyssey2", "Odyssey 2 / Videopac", listOf(".o2"), "o2em_libretro_android.so", "https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/o2em_libretro_android.so.zip"),
        AndroidCoreSpec("channelf", "Fairchild Channel F", listOf(".chf"), "freechaf_libretro_android.so", "https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/freechaf_libretro_android.so.zip"),
        AndroidCoreSpec("3do", "3DO Multiplayer", listOf(".chd", ".cue"), "opera_libretro_android.so", "https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/opera_libretro_android.so.zip"),
        AndroidCoreSpec("c64", "Commodore 64 / VIC-20", listOf(".d64", ".t64", ".prg", ".crt"), "vice_x64_libretro_android.so", "https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/vice_x64_libretro_android.so.zip"),
        AndroidCoreSpec("pc88", "NEC PC-8801", listOf(".d88", ".t88"), "quasi88_libretro_android.so", "https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/quasi88_libretro_android.so.zip"),
        AndroidCoreSpec("sharpx1", "Sharp X1", listOf(".dx1", ".2d", ".tap"), "x1_libretro_android.so", "https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/x1_libretro_android.so.zip"),
        AndroidCoreSpec("thomson", "Thomson MO/TO", listOf(".fd", ".sap", ".k7"), "theodore_libretro_android.so", "https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/theodore_libretro_android.so.zip"),
        AndroidCoreSpec("p2000", "Philips P2000T", listOf(".cas"), "m2000_libretro_android.so", "https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/m2000_libretro_android.so.zip"),
        AndroidCoreSpec("mac", "Macintosh Plus", listOf(".dsk"), "minivmac_libretro_android.so", "https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/minivmac_libretro_android.so.zip"),
        AndroidCoreSpec("bk", "Elektronika BK", listOf(".bk"), "bk_libretro_android.so", "https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/bk_libretro_android.so.zip"),
        AndroidCoreSpec("galaksija", "Galaksija", listOf(".gtp"), "galaksija_libretro_android.so", "https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/galaksija_libretro_android.so.zip"),
        AndroidCoreSpec("pico8", "PICO-8", listOf(".p8", ".p8.png"), "retro8_libretro_android.so", "https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/retro8_libretro_android.so.zip"),
        AndroidCoreSpec("tic80", "TIC-80", listOf(".tic"), "tic80_libretro_android.so", "https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/tic80_libretro_android.so.zip"),
        AndroidCoreSpec("wasm4", "WASM-4", listOf(".wasm"), "wasm4_libretro_android.so", "https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/wasm4_libretro_android.so.zip"),
        AndroidCoreSpec("arduboy", "Arduboy", listOf(".hex", ".arduboy"), "arduous_libretro_android.so", "https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/arduous_libretro_android.so.zip"),
        AndroidCoreSpec("uzebox", "Uzebox", listOf(".uze"), "uzem_libretro_android.so", "https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/uzem_libretro_android.so.zip"),
        AndroidCoreSpec("doom", "Doom / Quake / Engines", listOf(".wad", ".pak", ".wl6", ".nx", ".uw8", ".vspec"), "prboom_libretro_android.so", "https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/prboom_libretro_android.so.zip")
    )

    fun detectForFilename(fileName: String): AndroidCoreSpec {
        val lower = fileName.lowercase()
        for (blocked in sonyBlocked) {
            if (lower.endsWith(blocked)) {
                throw IllegalArgumentException("Consoles Sony ($blocked) não são permitidos nesta build.")
            }
        }
        return cores.firstOrNull { spec -> spec.extensions.any { lower.endsWith(it) } }
            ?: throw IllegalArgumentException("Extensão não suportada: $fileName")
    }
}
`,
  },
  {
    path: 'app/src/main/java/com/familink/emulator/RomVerifier.kt',
    language: 'kotlin',
    description: 'Leitor nativo SAF + cálculo SHA-256 + detecção de Região (Japão vs EUA) sem WebView.',
    content: `package com.familink.emulator

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import java.security.MessageDigest

enum class RomRegion { USA, JPN, EUR, WORLD }

data class VerifiedRom(
    val fileName: String,
    val coreSpec: AndroidCoreSpec,
    val region: RomRegion,
    val sha256: String,
    val bytes: ByteArray
)

object RomVerifier {
    fun loadFromUri(context: Context, uri: Uri): VerifiedRom {
        val fileName = resolveName(context, uri)
        val coreSpec = CoreRegistry.detectForFilename(fileName)
        val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
            ?: throw IllegalStateException("Falha ao abrir arquivo ROM.")

        val digest = MessageDigest.getInstance("SHA-256").digest(bytes)
        val sha256 = digest.joinToString("") { "%02x".format(it) }
        val region = detectRegion(fileName, bytes, coreSpec.id)

        return VerifiedRom(fileName, coreSpec, region, sha256, bytes)
    }

    fun validateMatch(hostHash: String, hostRegion: RomRegion, guest: VerifiedRom): Pair<Boolean, String> {
        if (guest.region != hostRegion) {
            return false to "Incompatível! Sala exige \${hostRegion.name}, mas sua ROM é \${guest.region.name}."
        }
        if (guest.sha256 != hostHash) {
            return false to "ROM diferente! SHA-256 do P2 não corresponde à ROM do Host P1."
        }
        return true to "ROM e Região verificadas!"
    }

    private fun detectRegion(name: String, bytes: ByteArray, consoleId: String): RomRegion {
        val upper = name.uppercase()
        return when {
            Regex("\\\\(J\\\\)|\\\\(JAPAN\\\\)|\\\\(JP\\\\)|FAMICOM").containsMatchIn(upper) -> RomRegion.JPN
            Regex("\\\\(U\\\\)|\\\\(USA\\\\)|\\\\(US\\\\)").containsMatchIn(upper) -> RomRegion.USA
            Regex("\\\\(E\\\\)|\\\\(EUROPE\\\\)|\\\\(PAL\\\\)").containsMatchIn(upper) -> RomRegion.EUR
            Regex("\\\\(W\\\\)|\\\\(WORLD\\\\)").containsMatchIn(upper) -> RomRegion.WORLD
            (consoleId == "gb" || consoleId == "gbc") && bytes.size > 0x14A ->
                if (bytes[0x14A].toInt() == 0) RomRegion.JPN else RomRegion.USA
            consoleId == "gba" && bytes.size > 0xB0 -> when (bytes[0xAF].toInt().toChar()) {
                'J' -> RomRegion.JPN
                'P', 'D', 'F' -> RomRegion.EUR
                else -> RomRegion.USA
            }
            else -> RomRegion.USA
        }
    }

    private fun resolveName(context: Context, uri: Uri): String {
        context.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
            val idx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            if (cursor.moveToFirst() && idx >= 0) return cursor.getString(idx)
        }
        return uri.lastPathSegment ?: "game.rom"
    }
}
`,
  },
  {
    path: 'app/src/main/java/com/familink/emulator/NativeCoreBridge.kt',
    language: 'kotlin',
    description: 'Interface JNI direta com motores nativos (.so) em C++ sem RetroArch e sem WebView.',
    content: `package com.familink.emulator

object NativeCoreBridge {
    init {
        System.loadLibrary("familink_bridge")
    }

    external fun nativeLoadCore(soPath: String): Boolean
    external fun nativeLoadRomBytes(romPath: String, bytes: ByteArray): Boolean
    external fun nativeRunFrame(p1Mask: Int, p2Mask: Int, outArgbPixels: IntArray): Int
    external fun nativeReadAudio(outPcm16: ShortArray): Int
    external fun nativeSaveState(): ByteArray?
    external fun nativeLoadState(stateBytes: ByteArray): Boolean
    external fun nativeUnload()
}
`,
  },
  {
    path: 'app/src/main/cpp/CMakeLists.txt',
    language: 'cmake',
    description: 'Build CMake para compilar a ponte JNI nativa no Android.',
    content: `cmake_minimum_required(VERSION 3.22.1)
project("familink_bridge")

add_library(familink_bridge SHARED native_core_bridge.cpp)
find_library(log-lib log)
target_link_libraries(familink_bridge \${log-lib} dl)
`,
  },
  {
    path: 'app/src/main/cpp/native_core_bridge.cpp',
    language: 'cpp',
    description: 'Ponte C++ NDK que executa motores nativos (.so) via dlopen/dlsym sem RetroArch e sem WebView.',
    content: `#include <jni.h>
#include <dlfcn.h>
#include <cstdint>
#include <cstring>
#include <vector>

struct retro_game_info {
    const char* path;
    const void* data;
    size_t size;
    const char* meta;
};

static void* g_core_handle = nullptr;
static void (*g_retro_init)(void) = nullptr;
static void (*g_retro_deinit)(void) = nullptr;
static bool (*g_retro_load_game)(const retro_game_info*) = nullptr;
static void (*g_retro_unload_game)(void) = nullptr;
static void (*g_retro_run)(void) = nullptr;
static size_t (*g_retro_serialize_size)(void) = nullptr;
static bool (*g_retro_serialize)(void*, size_t) = nullptr;
static bool (*g_retro_unserialize)(const void*, size_t) = nullptr;
static void (*g_set_env)(bool (*)(unsigned, void*)) = nullptr;
static void (*g_set_video)(void (*)(const void*, unsigned, unsigned, size_t)) = nullptr;
static void (*g_set_audio_batch)(size_t (*)(const int16_t*, size_t)) = nullptr;
static void (*g_set_input_poll)(void (*)(void)) = nullptr;
static void (*g_set_input_state)(int16_t (*)(unsigned, unsigned, unsigned, unsigned)) = nullptr;

static std::vector<uint32_t> g_pixels;
static std::vector<int16_t> g_audio_ring;
static uint32_t g_p1_mask = 0;
static uint32_t g_p2_mask = 0;
static unsigned g_width = 256;
static unsigned g_height = 240;

static bool env_cb(unsigned cmd, void* data) {
    if (cmd == 10 && data) { // RETRO_ENVIRONMENT_SET_PIXEL_FORMAT
        return true;
    }
    return false;
}

static void video_cb(const void* data, unsigned width, unsigned height, size_t pitch) {
    if (!data) return;
    g_width = width;
    g_height = height;
    g_pixels.resize(width * height);
    const uint8_t* src = static_cast<const uint8_t*>(data);
    for (unsigned y = 0; y < height; y++) {
        const uint16_t* row = reinterpret_cast<const uint16_t*>(src + y * pitch);
        for (unsigned x = 0; x < width; x++) {
            uint16_t c = row[x];
            uint32_t r = ((c >> 11) & 0x1F) * 255 / 31;
            uint32_t g = ((c >> 5) & 0x3F) * 255 / 63;
            uint32_t b = (c & 0x1F) * 255 / 31;
            g_pixels[y * width + x] = 0xFF000000 | (r << 16) | (g << 8) | b;
        }
    }
}

static size_t audio_batch_cb(const int16_t* data, size_t frames) {
    if (data && frames > 0) {
        g_audio_ring.insert(g_audio_ring.end(), data, data + frames * 2);
    }
    return frames;
}

static void input_poll_cb(void) {}

static int16_t input_state_cb(unsigned port, unsigned device, unsigned, unsigned id) {
    if (device != 1) return 0; // RETRO_DEVICE_JOYPAD
    uint32_t mask = (port == 0) ? g_p1_mask : (port == 1 ? g_p2_mask : 0);
    return (mask & (1u << id)) ? 1 : 0;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_com_familink_emulator_NativeCoreBridge_nativeLoadCore(JNIEnv* env, jobject, jstring soPath) {
    const char* path = env->GetStringUTFChars(soPath, nullptr);
    g_core_handle = dlopen(path, RTLD_LAZY);
    env->ReleaseStringUTFChars(soPath, path);
    if (!g_core_handle) return JNI_FALSE;

    g_retro_init = reinterpret_cast<void(*)()>(dlsym(g_core_handle, "retro_init"));
    g_retro_deinit = reinterpret_cast<void(*)()>(dlsym(g_core_handle, "retro_deinit"));
    g_retro_load_game = reinterpret_cast<bool(*)(const retro_game_info*)>(dlsym(g_core_handle, "retro_load_game"));
    g_retro_unload_game = reinterpret_cast<void(*)()>(dlsym(g_core_handle, "retro_unload_game"));
    g_retro_run = reinterpret_cast<void(*)()>(dlsym(g_core_handle, "retro_run"));
    g_retro_serialize_size = reinterpret_cast<size_t(*)()>(dlsym(g_core_handle, "retro_serialize_size"));
    g_retro_serialize = reinterpret_cast<bool(*)(void*, size_t)>(dlsym(g_core_handle, "retro_serialize"));
    g_retro_unserialize = reinterpret_cast<bool(*)(const void*, size_t)>(dlsym(g_core_handle, "retro_unserialize"));
    g_set_env = reinterpret_cast<void(*)(bool(*)(unsigned, void*))>(dlsym(g_core_handle, "retro_set_environment"));
    g_set_video = reinterpret_cast<void(*)(void(*)(const void*, unsigned, unsigned, size_t))>(dlsym(g_core_handle, "retro_set_video_refresh"));
    g_set_audio_batch = reinterpret_cast<void(*)(size_t(*)(const int16_t*, size_t))>(dlsym(g_core_handle, "retro_set_audio_sample_batch"));
    g_set_input_poll = reinterpret_cast<void(*)(void(*)())>(dlsym(g_core_handle, "retro_set_input_poll"));
    g_set_input_state = reinterpret_cast<void(*)(int16_t(*)(unsigned, unsigned, unsigned, unsigned))>(dlsym(g_core_handle, "retro_set_input_state"));

    if (!g_retro_init || !g_retro_run || !g_retro_load_game) return JNI_FALSE;
    if (g_set_env) g_set_env(env_cb);
    g_retro_init();
    if (g_set_video) g_set_video(video_cb);
    if (g_set_audio_batch) g_set_audio_batch(audio_batch_cb);
    if (g_set_input_poll) g_set_input_poll(input_poll_cb);
    if (g_set_input_state) g_set_input_state(input_state_cb);
    return JNI_TRUE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_com_familink_emulator_NativeCoreBridge_nativeLoadRomBytes(JNIEnv* env, jobject, jstring romPath, jbyteArray bytes) {
    if (!g_retro_load_game) return JNI_FALSE;
    const char* path = env->GetStringUTFChars(romPath, nullptr);
    jsize len = env->GetArrayLength(bytes);
    jbyte* raw = env->GetByteArrayElements(bytes, nullptr);
    retro_game_info info { path, raw, static_cast<size_t>(len), nullptr };
    bool ok = g_retro_load_game(&info);
    env->ReleaseByteArrayElements(bytes, raw, JNI_ABORT);
    env->ReleaseStringUTFChars(romPath, path);
    return ok ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jint JNICALL
Java_com_familink_emulator_NativeCoreBridge_nativeRunFrame(JNIEnv* env, jobject, jint p1Mask, jint p2Mask, jintArray outPixels) {
    if (!g_retro_run) return 0;
    g_p1_mask = static_cast<uint32_t>(p1Mask);
    g_p2_mask = static_cast<uint32_t>(p2Mask);
    g_retro_run();
    jsize maxLen = env->GetArrayLength(outPixels);
    jsize copyCount = std::min<jsize>(maxLen, static_cast<jsize>(g_pixels.size()));
    if (copyCount > 0) {
        env->SetIntArrayRegion(outPixels, 0, copyCount, reinterpret_cast<const jint*>(g_pixels.data()));
    }
    return static_cast<jint>((g_width << 16) | (g_height & 0xFFFF));
}

extern "C" JNIEXPORT jint JNICALL
Java_com_familink_emulator_NativeCoreBridge_nativeReadAudio(JNIEnv* env, jobject, jshortArray outPcm) {
    jsize maxLen = env->GetArrayLength(outPcm);
    jsize count = std::min<jsize>(maxLen, static_cast<jsize>(g_audio_ring.size()));
    if (count > 0) {
        env->SetShortArrayRegion(outPcm, 0, count, g_audio_ring.data());
        g_audio_ring.erase(g_audio_ring.begin(), g_audio_ring.begin() + count);
    }
    return count;
}

extern "C" JNIEXPORT jbyteArray JNICALL
Java_com_familink_emulator_NativeCoreBridge_nativeSaveState(JNIEnv* env, jobject) {
    if (!g_retro_serialize_size || !g_retro_serialize) return nullptr;
    size_t sz = g_retro_serialize_size();
    std::vector<uint8_t> buf(sz);
    if (!g_retro_serialize(buf.data(), sz)) return nullptr;
    jbyteArray out = env->NewByteArray(static_cast<jsize>(sz));
    env->SetByteArrayRegion(out, 0, static_cast<jsize>(sz), reinterpret_cast<const jbyte*>(buf.data()));
    return out;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_com_familink_emulator_NativeCoreBridge_nativeLoadState(JNIEnv* env, jobject, jbyteArray stateBytes) {
    if (!g_retro_unserialize) return JNI_FALSE;
    jsize len = env->GetArrayLength(stateBytes);
    jbyte* raw = env->GetByteArrayElements(stateBytes, nullptr);
    bool ok = g_retro_unserialize(raw, static_cast<size_t>(len));
    env->ReleaseByteArrayElements(stateBytes, raw, JNI_ABORT);
    return ok ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT void JNICALL
Java_com_familink_emulator_NativeCoreBridge_nativeUnload(JNIEnv*, jobject) {
    if (g_retro_unload_game) g_retro_unload_game();
    if (g_retro_deinit) g_retro_deinit();
    if (g_core_handle) { dlclose(g_core_handle); g_core_handle = nullptr; }
}
`,
  },
  {
    path: 'app/src/main/java/com/familink/emulator/EmulatorSurfaceView.kt',
    language: 'kotlin',
    description: 'Renderizador nativo SurfaceView + Canvas + AudioTrack (30 FPS / 60 FPS, zero RetroArch, zero WebView).',
    content: `package com.familink.emulator

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Paint
import android.graphics.Rect
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import android.view.SurfaceHolder
import android.view.SurfaceView

class EmulatorSurfaceView(context: Context) : SurfaceView(context), SurfaceHolder.Callback {
    private var running = false
    private var renderThread: Thread? = null
    private val pixelBuf = IntArray(640 * 480)
    private val audioBuf = ShortArray(4096)
    private val paint = Paint().apply { isFilterBitmap = false }

    @Volatile var p1Mask: Int = 0
    @Volatile var p2Mask: Int = 0
    @Volatile var targetFps: Int = 30

    init {
        holder.addCallback(this)
        isFocusable = true
    }

    override fun surfaceCreated(holder: SurfaceHolder) {
        running = true
        val track = AudioTrack.Builder()
            .setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_GAME).build())
            .setAudioFormat(
                AudioFormat.Builder()
                    .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                    .setSampleRate(44100)
                    .setChannelMask(AudioFormat.CHANNEL_OUT_STEREO)
                    .build()
            )
            .setBufferSizeInBytes(16384)
            .build()
        track.play()

        renderThread = Thread {
            var bmp = Bitmap.createBitmap(256, 240, Bitmap.Config.ARGB_8888)
            var frameTick = 0L
            while (running) {
                val frameStartMs = System.currentTimeMillis()
                val packedDim = NativeCoreBridge.nativeRunFrame(p1Mask, p2Mask, pixelBuf)
                frameTick++

                // Em modo 30 FPS (celular fraco), evita re-upload de bitmap nos quadros ímpares
                val shouldDraw = targetFps >= 60 || (frameTick % 2L == 0L)
                if (shouldDraw) {
                    val w = (packedDim ushr 16).coerceAtLeast(160)
                    val h = (packedDim and 0xFFFF).coerceAtLeast(144)
                    if (bmp.width != w || bmp.height != h) {
                        bmp.recycle()
                        bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
                    }
                    bmp.setPixels(pixelBuf, 0, w, 0, 0, w, h)

                    val canvas = holder.lockCanvas()
                    if (canvas != null) {
                        try {
                            canvas.drawRGB(0, 0, 0)
                            val dst = Rect(0, 0, canvas.width, canvas.height)
                            canvas.drawBitmap(bmp, null, dst, paint)
                        } finally {
                            holder.unlockCanvasAndPost(canvas)
                        }
                    }
                }

                val samples = NativeCoreBridge.nativeReadAudio(audioBuf)
                if (samples > 0) {
                    track.write(audioBuf, 0, samples)
                }

                val frameBudgetMs = 16L
                val elapsed = System.currentTimeMillis() - frameStartMs
                if (elapsed < frameBudgetMs) {
                    Thread.sleep(frameBudgetMs - elapsed)
                }
            }
            track.stop()
            track.release()
            bmp.recycle()
        }.apply { start() }
    }

    override fun surfaceChanged(holder: SurfaceHolder, format: Int, width: Int, height: Int) {}

    override fun surfaceDestroyed(holder: SurfaceHolder) {
        running = false
        renderThread?.join(500)
        renderThread = null
    }
}
`,
  },
  {
    path: 'app/src/main/java/com/familink/emulator/NetplayFirebaseManager.kt',
    language: 'kotlin',
    description: 'Cliente Firebase Firestore (ai-studio-9b47464d-83f5-4195-ab77-803c3474f722) com aprovação P1 -> P2.',
    content: `package com.familink.emulator

import com.google.firebase.FirebaseApp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore

class NetplayFirebaseManager {
    private val auth = FirebaseAuth.getInstance()
    private val db = FirebaseFirestore.getInstance(
        FirebaseApp.getInstance(),
        "ai-studio-9b47464d-83f5-4195-ab77-803c3474f722"
    )

    fun createRoom(roomCode: String, rom: VerifiedRom, mode: String, onDone: (Result<Unit>) -> Unit) {
        val user = auth.currentUser ?: return onDone(Result.failure(Exception("Faça login primeiro.")))
        val doc = hashMapOf(
            "roomCode" to roomCode,
            "hostUid" to user.uid,
            "hostName" to (user.displayName ?: user.email ?: "Host P1"),
            "guestUid" to "",
            "guestName" to "",
            "mode" to mode,
            "consoleId" to rom.coreSpec.id,
            "romName" to rom.fileName,
            "romHash" to rom.sha256,
            "romRegion" to rom.region.name,
            "romSize" to rom.bytes.size,
            "guestRomHash" to "",
            "guestRomRegion" to "NONE",
            "guestAccessStatus" to "empty",
            "status" to "waiting",
            "inputDelay" to 1,
            "createdAt" to FieldValue.serverTimestamp(),
            "updatedAt" to FieldValue.serverTimestamp()
        )
        db.collection("rooms").document(roomCode).set(doc)
            .addOnSuccessListener { onDone(Result.success(Unit)) }
            .addOnFailureListener { onDone(Result.failure(it)) }
    }

    fun approveP2(roomCode: String, approve: Boolean) {
        db.collection("rooms").document(roomCode).update(
            mapOf(
                "guestAccessStatus" to if (approve) "approved" else "denied",
                "status" to if (approve) "playing" else "waiting",
                "updatedAt" to FieldValue.serverTimestamp()
            )
        )
    }
}
`,
  },
  {
    path: 'app/src/main/java/com/familink/emulator/MainActivity.kt',
    language: 'kotlin',
    description: 'Activity Jetpack Compose com seletor SAF, SurfaceView (sem WebView), controle PlayStation automático na tela e suporte universal Bluetooth.',
    content: `package com.familink.emulator

import android.content.Context
import android.hardware.input.InputManager
import android.os.Bundle
import android.view.InputDevice
import android.view.KeyEvent
import android.view.MotionEvent
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import java.io.File

class MainActivity : ComponentActivity() {
    private var surfaceRef: EmulatorSurfaceView? = null
    private var btMask = 0
    private var touchMask = 0
    private val btNamesState = mutableStateOf<List<String>>(emptyList())

    private fun refreshBluetoothPads() {
        val im = getSystemService(Context.INPUT_SERVICE) as InputManager
        btNamesState.value = im.inputDeviceIds.mapNotNull { id ->
            val dev = InputDevice.getDevice(id) ?: return@mapNotNull null
            val isPad = (dev.sources and InputDevice.SOURCE_GAMEPAD) == InputDevice.SOURCE_GAMEPAD ||
                (dev.sources and InputDevice.SOURCE_JOYSTICK) == InputDevice.SOURCE_JOYSTICK
            if (isPad) dev.name else null
        }
    }

    private fun updateTouchBit(bit: Int, down: Boolean) {
        touchMask = if (down) (touchMask or (1 shl bit)) else (touchMask and (1 shl bit).inv())
        surfaceRef?.p1Mask = btMask or touchMask
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        refreshBluetoothPads()

        setContent {
            val ctx = LocalContext.current
            var loadedRom by remember { mutableStateOf<VerifiedRom?>(null) }
            var targetFps by remember { mutableStateOf(30) }
            var statusMsg by remember { mutableStateOf("Sem jogos de exemplo · Selecione sua ROM") }
            val btDevices by btNamesState

            val romPicker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
                if (uri != null) {
                    runCatching {
                        val rom = RomVerifier.loadFromUri(ctx, uri)
                        val coreFile = File(ctx.filesDir, "cores/\${rom.coreSpec.nativeSoName}")
                        if (!coreFile.exists()) {
                            throw IllegalStateException("Baixe o motor \${rom.coreSpec.nativeSoName} para files/cores/")
                        }
                        NativeCoreBridge.nativeLoadCore(coreFile.absolutePath)
                        NativeCoreBridge.nativeLoadRomBytes(rom.fileName, rom.bytes)
                        loadedRom = rom
                        statusMsg = "\${rom.coreSpec.consoleName} · \${rom.region} · SHA256 \${rom.sha256.take(10)}"
                    }.onFailure { err ->
                        statusMsg = err.message ?: "Erro ao carregar ROM"
                    }
                }
            }

            Column(modifier = Modifier.fillMaxSize().background(Color(0xFF0B0E14)).padding(12.dp)) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("FamiLink Nativo (Android SDK)", color = Color.White, style = MaterialTheme.typography.titleMedium)
                        Text(statusMsg, color = Color(0xFF9CA3AF), style = MaterialTheme.typography.bodySmall)
                        Text(
                            if (btDevices.isEmpty()) "Bluetooth: Aguardando controle (auto)"
                            else "Bluetooth ativo: \${btDevices.joinToString()}",
                            color = if (btDevices.isEmpty()) Color(0xFF38BDF8) else Color(0xFF34D399),
                            style = MaterialTheme.typography.labelSmall
                        )
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        OutlinedButton(onClick = { targetFps = if (targetFps == 30) 60 else 30 }) {
                            Text(if (targetFps == 30) "30 FPS" else "60 FPS", color = Color.White)
                        }
                        Button(onClick = { romPicker.launch(arrayOf("*/*")) }) {
                            Text("Abrir ROM")
                        }
                    }
                }

                Spacer(Modifier.height(8.dp))

                Box(modifier = Modifier.fillMaxWidth().weight(1f).background(Color.Black)) {
                    if (loadedRom != null) {
                        AndroidView(
                            factory = { context ->
                                EmulatorSurfaceView(context).also {
                                    it.targetFps = targetFps
                                    surfaceRef = it
                                }
                            },
                            update = { view -> view.targetFps = targetFps },
                            modifier = Modifier.fillMaxSize()
                        )
                    }
                }

                Spacer(Modifier.height(8.dp))

                // Controle PlayStation na tela ativo automaticamente logo ao abrir
                Row(
                    modifier = Modifier.fillMaxWidth().background(Color(0xFF12161F)).padding(10.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // D-Pad
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        PsPadButton("▲", 4) { bit, down -> updateTouchBit(bit, down) }
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            PsPadButton("◀", 6) { bit, down -> updateTouchBit(bit, down) }
                            PsPadButton("▶", 7) { bit, down -> updateTouchBit(bit, down) }
                        }
                        PsPadButton("▼", 5) { bit, down -> updateTouchBit(bit, down) }
                    }

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        PsPadButton("SEL", 2) { bit, down -> updateTouchBit(bit, down) }
                        PsPadButton("STR", 3) { bit, down -> updateTouchBit(bit, down) }
                    }

                    // Botões PlayStation (△ ○ ✕ □)
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        PsPadButton("△", 8, Color(0xFF10B981)) { bit, down -> updateTouchBit(bit, down) }
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            PsPadButton("□", 9, Color(0xFFEC4899)) { bit, down -> updateTouchBit(bit, down) }
                            PsPadButton("○", 0, Color(0xFFEF4444)) { bit, down -> updateTouchBit(bit, down) }
                        }
                        PsPadButton("✕", 1, Color(0xFF3B82F6)) { bit, down -> updateTouchBit(bit, down) }
                    }
                }
            }
        }
    }

    @Composable
    private fun PsPadButton(
        label: String,
        bit: Int,
        tint: Color = Color.White,
        onTouch: (Int, Boolean) -> Unit
    ) {
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .size(44.dp)
                .background(Color(0xFF1D2332), CircleShape)
                .pointerInput(bit) {
                    detectTapGestures(
                        onPress = {
                            onTouch(bit, true)
                            tryAwaitRelease()
                            onTouch(bit, false)
                        }
                    )
                }
        ) {
            Text(label, color = tint, style = MaterialTheme.typography.labelLarge)
        }
    }

    override fun onGenericMotionEvent(event: MotionEvent): Boolean {
        if ((event.source and InputDevice.SOURCE_JOYSTICK) == InputDevice.SOURCE_JOYSTICK &&
            event.action == MotionEvent.ACTION_MOVE
        ) {
            val x = event.getAxisValue(MotionEvent.AXIS_X)
            val y = event.getAxisValue(MotionEvent.AXIS_Y)
            val hatX = event.getAxisValue(MotionEvent.AXIS_HAT_X)
            val hatY = event.getAxisValue(MotionEvent.AXIS_HAT_Y)
            var next = btMask and (0xF0.inv())
            if (y < -0.4f || hatY < -0.5f) next = next or (1 shl 4)
            if (y > 0.4f || hatY > 0.5f) next = next or (1 shl 5)
            if (x < -0.4f || hatX < -0.5f) next = next or (1 shl 6)
            if (x > 0.4f || hatX > 0.5f) next = next or (1 shl 7)
            btMask = next
            surfaceRef?.p1Mask = btMask or touchMask
            return true
        }
        return super.onGenericMotionEvent(event)
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        refreshBluetoothPads()
        val bit = mapKeyBit(keyCode)
        if (bit >= 0) {
            btMask = btMask or (1 shl bit)
            surfaceRef?.p1Mask = btMask or touchMask
            return true
        }
        return super.onKeyDown(keyCode, event)
    }

    override fun onKeyUp(keyCode: Int, event: KeyEvent?): Boolean {
        val bit = mapKeyBit(keyCode)
        if (bit >= 0) {
            btMask = btMask and (1 shl bit).inv()
            surfaceRef?.p1Mask = btMask or touchMask
            return true
        }
        return super.onKeyUp(keyCode, event)
    }

    private fun mapKeyBit(keyCode: Int): Int = when (keyCode) {
        KeyEvent.KEYCODE_BUTTON_B, KeyEvent.KEYCODE_X -> 0   // ○ / A
        KeyEvent.KEYCODE_BUTTON_A, KeyEvent.KEYCODE_Z -> 1   // ✕ / B
        KeyEvent.KEYCODE_BUTTON_SELECT, KeyEvent.KEYCODE_SHIFT_LEFT -> 2
        KeyEvent.KEYCODE_BUTTON_START, KeyEvent.KEYCODE_ENTER -> 3
        KeyEvent.KEYCODE_DPAD_UP, KeyEvent.KEYCODE_W -> 4
        KeyEvent.KEYCODE_DPAD_DOWN, KeyEvent.KEYCODE_S -> 5
        KeyEvent.KEYCODE_DPAD_LEFT, KeyEvent.KEYCODE_A -> 6
        KeyEvent.KEYCODE_DPAD_RIGHT, KeyEvent.KEYCODE_D -> 7
        KeyEvent.KEYCODE_BUTTON_Y -> 8                       // △ / X
        KeyEvent.KEYCODE_BUTTON_X -> 9                       // □ / Y
        KeyEvent.KEYCODE_BUTTON_L1 -> 10
        KeyEvent.KEYCODE_BUTTON_R1 -> 11
        KeyEvent.KEYCODE_BUTTON_L2 -> 12
        KeyEvent.KEYCODE_BUTTON_R2 -> 13
        else -> -1
    }
}
`,
  },
];

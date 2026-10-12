plugins {
    kotlin("jvm") version "2.4.21"
    kotlin("plugin.serialization") version "2.4.21"
    application
}

repositories { mavenCentral() }

val kotlinVersion = "2.4.21"

val webLibs: Configuration by configurations.creating { isTransitive = false }

dependencies {
    implementation("org.jetbrains.kotlin:kotlin-compiler-embeddable:$kotlinVersion")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.11.0")
    webLibs("org.jetbrains.kotlin:kotlin-stdlib-js:$kotlinVersion@klib")
    webLibs("org.jetbrains.kotlin:kotlin-test-js:$kotlinVersion@klib")
}

application { mainClass = "typika.compiler.ServerKt" }

val copyWebLibs by tasks.registering(Copy::class) {
    from(webLibs)
    into(layout.buildDirectory.dir("web-libs"))
}

tasks.named("installDist") { dependsOn(copyWebLibs) }

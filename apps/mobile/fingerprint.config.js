// The release bump edits app.json's version, and without this skip it would
// change the fingerprint, so every release would need a store build. Setting
// sourceSkips replaces the default, so the prebuild script rewrite is kept too.
const { SourceSkips } = require('expo/fingerprint')

/** @type {import('expo/fingerprint').Config} */
module.exports = {
  sourceSkips:
    SourceSkips.ExpoConfigVersions |
    SourceSkips.PackageJsonAndroidAndIosScriptsIfNotContainRun,
}

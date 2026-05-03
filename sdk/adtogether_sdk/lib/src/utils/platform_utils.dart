import 'platform_utils_native.dart'
    if (dart.library.js_interop) 'platform_utils_web.dart'
    as impl;

/// A representation of package information.
class AdPackageInfo {
  /// The user-visible name of the application.
  final String appName;

  /// The platform-specific package name (e.g. `com.example.myapp`).
  final String packageName;

  /// The version string of the application (e.g. `1.0.0`).
  final String version;

  /// Creates a new [AdPackageInfo] with the given metadata.
  AdPackageInfo({
    required this.appName,
    required this.packageName,
    required this.version,
  });

  /// Creates an empty [AdPackageInfo] with blank fields.
  const AdPackageInfo.empty() : appName = '', packageName = '', version = '';
}

/// Abstract base class for platform-specific information providers.
abstract class PlatformInfoProvider {
  /// Retrieves the current application's package information.
  Future<AdPackageInfo> getPackageInfo();

  static PlatformInfoProvider get instance => impl.PlatformInfoProviderImpl();
}

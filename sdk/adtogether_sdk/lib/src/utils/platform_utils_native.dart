import 'dart:io' show Platform;
import 'platform_utils.dart';

class PlatformInfoProviderImpl implements PlatformInfoProvider {
  @override
  Future<AdPackageInfo> getPackageInfo() async {
    try {
      // On native platforms, we extract what we can from dart:io.
      // The package name (bundle ID) is typically provided by the developer
      // during AdTogether.initialize(), so we only need best-effort metadata.
      final executable = Platform.resolvedExecutable;
      final appName = executable.split(Platform.pathSeparator).last
          .replaceAll(RegExp(r'\.(exe|app)$'), '');

      return AdPackageInfo(
        appName: appName,
        packageName: '', // Provided by developer via bundleId parameter
        version: '', // Optional enrichment; not critical for ad serving
      );
    } catch (_) {
      return const AdPackageInfo.empty();
    }
  }
}

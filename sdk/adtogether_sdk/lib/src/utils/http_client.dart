import 'http_client_native.dart'
    if (dart.library.js_interop) 'http_client_web.dart'
    as impl;

/// A simple HTTP response wrapper.
class SimpleHttpResponse {
  /// The HTTP status code returned by the server.
  final int statusCode;

  /// The response body as a UTF-8 decoded string.
  final String body;

  /// Creates a new [SimpleHttpResponse].
  SimpleHttpResponse({required this.statusCode, required this.body});
}

/// A minimal, cross-platform HTTP client abstraction.
///
/// Uses `dart:io` [HttpClient] on native platforms and the `fetch` API
/// on the web, avoiding the need for the `package:http` dependency.
abstract class AdHttpClient {
  /// Performs an HTTP GET request to the given [url].
  Future<SimpleHttpResponse> get(Uri url);

  /// Performs an HTTP POST request to the given [url] with the specified
  /// [headers] and request [body].
  Future<SimpleHttpResponse> post(Uri url, {Map<String, String>? headers, String? body});

  /// Returns the platform-appropriate [AdHttpClient] implementation.
  static AdHttpClient get instance => impl.AdHttpClientImpl();
}

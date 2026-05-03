import 'dart:js_interop';

import 'http_client.dart';

/// JS interop binding for the Response object returned by fetch.
extension type _JsResponse(JSObject _) implements JSObject {
  external int get status;
  external JSPromise<JSString> text();
}

/// JS interop binding for the RequestInit options object.
extension type _JsRequestInit._(JSObject _) implements JSObject {
  external factory _JsRequestInit({
    String method,
    JSObject? headers,
    String? body,
  });
}

/// JS interop binding for the Headers object.
extension type _JsHeaders._(JSObject _) implements JSObject {
  external factory _JsHeaders();
  external void set(String name, String value);
}

@JS('fetch')
external JSPromise<_JsResponse> _jsFetch(String url, [_JsRequestInit? init]);

/// Web implementation of [AdHttpClient] using the browser `fetch` API
/// via `dart:js_interop`.
///
/// This avoids importing `dart:io` which is unavailable in web/WASM targets,
/// and does not require the `package:http` dependency.
class AdHttpClientImpl implements AdHttpClient {
  @override
  Future<SimpleHttpResponse> get(Uri url) async {
    final response = await _jsFetch(url.toString()).toDart;
    final bodyText = (await response.text().toDart).toDart;
    return SimpleHttpResponse(statusCode: response.status, body: bodyText);
  }

  @override
  Future<SimpleHttpResponse> post(
    Uri url, {
    Map<String, String>? headers,
    String? body,
  }) async {
    final jsHeaders = _JsHeaders();
    if (headers != null) {
      headers.forEach((key, value) {
        jsHeaders.set(key, value);
      });
    }

    final init = _JsRequestInit(
      method: 'POST',
      headers: jsHeaders,
      body: body,
    );

    final response = await _jsFetch(url.toString(), init).toDart;
    final bodyText = (await response.text().toDart).toDart;
    return SimpleHttpResponse(statusCode: response.status, body: bodyText);
  }
}

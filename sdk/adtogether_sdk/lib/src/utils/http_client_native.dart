import 'dart:convert';
import 'dart:io';

import 'http_client.dart';

/// Native (mobile/desktop) implementation of [AdHttpClient] using [dart:io].
class AdHttpClientImpl implements AdHttpClient {
  @override
  Future<SimpleHttpResponse> get(Uri url) async {
    final client = HttpClient();
    try {
      final request = await client.getUrl(url);
      final response = await request.close();
      final body = await response.transform(utf8.decoder).join();
      return SimpleHttpResponse(statusCode: response.statusCode, body: body);
    } finally {
      client.close();
    }
  }

  @override
  Future<SimpleHttpResponse> post(Uri url, {Map<String, String>? headers, String? body}) async {
    final client = HttpClient();
    try {
      final request = await client.postUrl(url);
      if (headers != null) {
        headers.forEach((key, value) {
          request.headers.set(key, value);
        });
      }
      if (body != null) {
        request.write(body);
      }
      final response = await request.close();
      final responseBody = await response.transform(utf8.decoder).join();
      return SimpleHttpResponse(statusCode: response.statusCode, body: responseBody);
    } finally {
      client.close();
    }
  }
}

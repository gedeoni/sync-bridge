package com.syncbridge.security;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;

public class AuthFilter implements Filter {

    private final String configuredToken;
    private final ObjectMapper mapper = new ObjectMapper();

    public AuthFilter(String configuredToken) {
        this.configuredToken = configuredToken;
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) throws IOException, ServletException {
        HttpServletRequest req = (HttpServletRequest) request;
        HttpServletResponse res = (HttpServletResponse) response;

        // Special handling for GraphQL POST endpoints
        if (req.getRequestURI().endsWith("/graphql")) {
            CachedBodyHttpServletRequest wrappedRequest = new CachedBodyHttpServletRequest(req);
            String bodyStr = new String(wrappedRequest.getCachedBody());
            // Token authorization is only required for GraphQL mutations that create objects
            if (bodyStr.contains("createEmployee") || (bodyStr.contains("mutation") && bodyStr.contains("create"))) {
                String token = req.getHeader("x-auth-token");
                if (token == null || configuredToken == null || !configuredToken.equals(token)) {
                    sendUnauthorized(res);
                    return;
                }
            }
            chain.doFilter(wrappedRequest, response);
            return;
        }

        // Standard REST endpoints
        String token = req.getHeader("x-auth-token");
        if (token == null || configuredToken == null || !configuredToken.equals(token)) {
            sendUnauthorized(res);
            return;
        }
        chain.doFilter(request, response);
    }

    private void sendUnauthorized(HttpServletResponse res) throws IOException {
        res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        Map<String, Object> body = new HashMap<>();
        body.put("status", HttpServletResponse.SC_UNAUTHORIZED);
        body.put("message", "Access Denied");
        res.setContentType("application/json");
        mapper.writeValue(res.getOutputStream(), body);
    }

    private static class CachedBodyHttpServletRequest extends HttpServletRequestWrapper {
        private final byte[] cachedBody;

        public CachedBodyHttpServletRequest(HttpServletRequest request) throws IOException {
            super(request);
            InputStream requestInputStream = request.getInputStream();
            this.cachedBody = requestInputStream.readAllBytes();
        }

        @Override
        public ServletInputStream getInputStream() {
            return new CachedBodyServletInputStream(this.cachedBody);
        }

        public byte[] getCachedBody() {
            return this.cachedBody;
        }
    }

    private static class CachedBodyServletInputStream extends ServletInputStream {
        private final ByteArrayInputStream inputStream;

        public CachedBodyServletInputStream(byte[] cachedBody) {
            this.inputStream = new ByteArrayInputStream(cachedBody);
        }

        @Override
        public boolean isFinished() {
            return inputStream.available() == 0;
        }

        @Override
        public boolean isReady() {
            return true;
        }

        @Override
        public void setReadListener(ReadListener readListener) {
            throw new UnsupportedOperationException();
        }

        @Override
        public int read() throws IOException {
            return inputStream.read();
        }
    }
}

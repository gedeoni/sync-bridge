package com.syncbridge.security;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;

public class RequestIdFilter implements Filter {
    public static final String REQ_ID_HEADER = "X-Request-Id";

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) throws IOException, ServletException {
        String reqId = UUID.randomUUID().toString();
        if (response instanceof HttpServletResponse http) {
            http.setHeader(REQ_ID_HEADER, reqId);
        }
        chain.doFilter(request, response);
    }
}


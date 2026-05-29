package com.syncbridge.config;

import com.syncbridge.security.AuthFilter;
import com.syncbridge.security.RequestIdFilter;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class WebConfig {

    @Bean
    public FilterRegistrationBean<RequestIdFilter> requestIdFilter() {
        FilterRegistrationBean<RequestIdFilter> registrationBean = new FilterRegistrationBean<>();
        registrationBean.setFilter(new RequestIdFilter());
        registrationBean.addUrlPatterns("/api/*");
        registrationBean.setOrder(1);
        return registrationBean;
    }

    @Bean
    public FilterRegistrationBean<AuthFilter> authFilter(@org.springframework.beans.factory.annotation.Value("${app.auth-token}") String token) {
        FilterRegistrationBean<AuthFilter> registrationBean = new FilterRegistrationBean<>();
        registrationBean.setFilter(new AuthFilter(token));
        registrationBean.addUrlPatterns("/api/v1/sync/*", "/api/v1/sync-history/*", "/api/v1/sync-history", "/api/v1/sync", "/graphql");
        registrationBean.setOrder(2);
        return registrationBean;
    }
}

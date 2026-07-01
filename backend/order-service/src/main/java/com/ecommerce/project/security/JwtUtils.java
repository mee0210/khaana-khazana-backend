package com.ecommerce.project.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

//Parsing JWT
@Component
public class JwtUtils {

    @Value("${jwt.secret}")
    private String secretKey;

    /**
     * Getting the userId
     *
     * @param authHeader
     * @return
     * @throws io.jsonwebtoken.JwtException
     */
    public String extractUserId(String authHeader) {
        String token = authHeader.substring(7);

        Claims claims = Jwts.parser()
                .setSigningKey(secretKey.getBytes())
                .parseClaimsJws(token)
                .getBody();

        return claims.getSubject();
    }
}

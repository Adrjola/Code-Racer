package org.coderacer.backend.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
class FrontendController {

  @GetMapping({
    "/admin",
    "/dashboard",
    "/forgot-password",
    "/login",
    "/not-found",
    "/play/solo",
    "/register",
    "/reset-password",
    "/solo",
    "/solo/preview",
    "/verify-email",
    "/verify-email-pending"
  })
  String forwardFrontendRoutes() {
    return "forward:/index.html";
  }
}

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/fishing/",
          "/species/",
          "/regulations",
          "/pricing",
          "/login",
          "/signup",
          "/explore",
          "/privacy",
          "/terms",
          "/contact",
          "/about",
          "/faq",
        ],
        disallow: [
          "/admin/",
          "/api/",
          "/profile/",
          "/dashboard",
          "/alerts",
          "/my-spots",
          "/billing/",
          "/settings/",
          "/notifications",
        ],
      },
    ],
    sitemap: "https://reelcaster.com/sitemap.xml",
  };
}

import type { NextConfig } from "next";
import withTM from "next-transpile-modules";

const nextConfig: NextConfig = {
  experimental: {
    esmExternals: false,
  },
};

export default withTM(["@mediapipe/pose"])(nextConfig);
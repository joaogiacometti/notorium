{
  description = "Notorium development environment";

  outputs = { nixpkgs, ... }:
    let
      system = "x86_64-linux";
      pkgs = import nixpkgs { inherit system; };
      # E2E projects only use Desktop Chrome.
      playwrightBrowsers = pkgs.playwright-driver.browsers.override {
        withFirefox = false;
        withWebkit = false;
      };
    in
    {
      devShells.${system}.default = pkgs.mkShell {
        packages = with pkgs; [
          bun
          nodejs_24
        ];
        # NixOS cannot exec the dynamically linked glibc Biome binary, so point
        # the @biomejs/biome shim at the statically linked musl build that bun
        # installs alongside it. This keeps the version pinned by package.json.
        # Playwright's downloaded browsers cannot run on NixOS either, so use the
        # nixpkgs builds. @playwright/test in package.json must be pinned to
        # exactly pkgs.playwright-driver.version or the browser revision differs.
        shellHook = ''
          export BIOME_BINARY="$PWD/node_modules/@biomejs/cli-linux-x64-musl/biome"
          export PLAYWRIGHT_BROWSERS_PATH="${playwrightBrowsers}"
          export PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=true
        '';
      };
    };
}

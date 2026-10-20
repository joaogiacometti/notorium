{
  description = "Notorium development shell";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { nixpkgs, ... }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
      ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
    in
    {
      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShell {
          packages = [
            pkgs.nodejs_24
            pkgs.biome
          ];
          # The npm-installed Biome binary is dynamically linked and won't run
          # on NixOS, so point the npm wrapper at the Nix-built one.
          shellHook = ''
            export BIOME_BINARY=${pkgs.biome}/bin/biome
          '';
          # Downloaded Playwright browsers won't run on NixOS either. Use the
          # Nix-built ones; nixpkgs must ship the same browser revisions as the
          # pinned @playwright/test (see node_modules/playwright-core/browsers.json).
          PLAYWRIGHT_BROWSERS_PATH = pkgs.playwright-driver.browsers;
        };
      });
    };
}

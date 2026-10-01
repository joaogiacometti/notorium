{
  description = "Notorium development environment";

  outputs = { nixpkgs, ... }:
    let
      system = "x86_64-linux";
      pkgs = import nixpkgs { inherit system; };
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
        shellHook = ''
          export BIOME_BINARY="$PWD/node_modules/@biomejs/cli-linux-x64-musl/biome"
        '';
      };
    };
}

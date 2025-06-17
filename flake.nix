{
  description = "Nix Development Flake for Hugo";

  inputs = {
    flake-utils.url = "github:numtide/flake-utils";
    nixpkgs_unstable.url = "github:NixOS/nixpkgs/nixos-unstable";
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.05";
  };

  outputs = { self, nixpkgs, nixpkgs_unstable, flake-utils }:

    flake-utils.lib.eachDefaultSystem (system:
      let
        # https://nixos.wiki/wiki/Rust
        # https://nixos.org/manual/nixpkgs/stable/#rust
        # if we want a specific rust version:
        # rust-overlay.url = "github:oxalica/rust-overlay";
        pkgs = import nixpkgs { inherit system; };
        pkgs_unstable = import nixpkgs_unstable { inherit system; };
        python = pkgs.python310;

        # this is all tauri-related stuff
        libraries = with pkgs; [
            
        ];
        packages = with pkgs; [
            hugo
            publii
            python

            nodejs_24
            yarn
        ];
      in {
        devShells.default = pkgs.mkShell rec {
          name = "hugo-dev";
          # TODO: what is this for? nativeBuildInputs = [ pkgs.bashInteractive ];
          buildInputs = libraries ++ packages;
          # the following comes from here: https://tauri.app/start/prerequisites/
          # but by declaring LD_LIBRARY_PATH we might have done it correctly already ;)
          # and thats why we're commenting it out...
          #PKG_CONFIG_PATH = "${glib.dev}/lib/pkgconfig:${libsoup_3.dev}/lib/pkgconfig:${webkitgtk_4_1.dev}/lib/pkgconfig:${at-spi2-atk.dev}/lib/pkgconfig:${gtk3.dev}/lib/pkgconfig:${gdk-pixbuf.dev}/lib/pkgconfig:${cairo.dev}/lib/pkgconfig:${pango.dev}/lib/pkgconfig:${harfbuzz.dev}/lib/pkgconfig";
          shellHook = ''
            # python poetry related stuff
            unset SOURCE_DATE_EPOCH
            unset LD_PRELOAD

            # Environment variables
            # fixes libstdc++ issues, libz.so.1 issues
            export LD_LIBRARY_PATH="${pkgs.stdenv.cc.cc.lib}/lib/:${
              pkgs.lib.makeLibraryPath buildInputs
            }";

            export NODE_OPTIONS="--max-old-space-size=8192"
            echo "increasing node memory allocation to $NODE_OPTIONS"

            if [ -f ./.env ]; then
              set -a  # automatically export all variables
              source ./.env
              set +a
            fi

            export PATH="$(pwd)/node_modules/.bin:$PATH"

            export LD_LIBRARY_PATH=${
              pkgs.lib.makeLibraryPath libraries
            }:$LD_LIBRARY_PATH
            export XDG_DATA_DIRS=${pkgs.gsettings-desktop-schemas}/share/gsettings-schemas/${pkgs.gsettings-desktop-schemas.name}:${pkgs.gtk3}/share/gsettings-schemas/${pkgs.gtk3.name}:$XDG_DATA_DIRS
          '';
        };
      });
}

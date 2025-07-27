with (import <nixpkgs> {});
mkShell {
  buildInputs = [
    nodejs
    #libuuid
  ];
  #env = { LD_LIBRARY_PATH = pkgs.lib.makeLibraryPath [pkgs.libuuid];  };
  shellHook = ''
      mkdir -p .nix-node
      export NODE_PATH=$PWD/.nix-node
      export NPM_CONFIG_PREFIX=$PWD/.nix-node
      export PATH=$NODE_PATH/bin:$PATH
      export LD_LIBRARY_PATH="${pkgs.lib.makeLibraryPath [ pkgs.libuuid ]}:$LD_LIBRARY_PATH";
  '';
}

{

description= "node mdpdf";

inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
		};


outputs = {nixpkgs, ...}:
  let
    system = "x86_64-linux";
	pkgs = import nixpkgs {
	inherit system;
	};
	
	in
{



	devShells.${system} = {

		default = pkgs.mkShell {
			packages = [ pkgs.nodejs_23];
			buildInputs = with pkgs; [
					];
			shellHook = ''
				npm config set prefix ~/.local/npm_global
				export PATH=$PATH:~/.local/npm_global/bin
				'';
		};

		base = (pkgs.buildFHSEnv {
			name = "node";
			targetPkgs = pkgs: (with pkgs; [
					nodejs_23
					
					]);

			runScript = "bash";
			profile = ''
# export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:${pkgs.glibc}/lib:${pkgs.glibc.out}/lib
				# export LD_LIBRARY_PATH=${pkgs.glib.out}/lib
				npm config set prefix ~/.local/npm_global
				export PATH=$PATH:~/.local/npm_global/bin
				'';
		}).env;
	};

};

}

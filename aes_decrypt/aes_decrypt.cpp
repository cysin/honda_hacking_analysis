#include <iostream>
#include <cstring>
#include <fstream>
#include <sstream>
#include "aes256.h"
//g++ -std=c++11 aes_decrypt.cpp aes256.c -o aes_decrypt
using namespace std;

static void memxor(unsigned char *dest, unsigned char *key, int length) {
  int i;
  for (i = 0; i < length; i++) {
    dest[i] = dest[i] ^ key[i];
  }
}

int main(int argc, char *argv[]){
    if(argc != 2) {
        cerr << argv[0] << " file_to_decrypt" << endl;
        return -1;
    }
    aes256_context aesctx;
    static unsigned char decryption_key[32] = {0xa2, 0xb0, 0xc8, 0xa5, 0xef, 0x11, 0xf4, 0x12, 0xc2, 0x67, 0x24, 0x4c, 0xb1, 0xbe, 0xc6, 0x15, 0x66, 0x1b, 0xda, 0xde, 0xae, 0x90, 0x36, 0xc1, 0x75, 0x68, 0xb0, 0xa9, 0x64, 0xc5, 0x43, 0x0e};
    aes256_init(&aesctx, decryption_key);
    
    string file(argv[1]);
    ifstream t(argv[1]);
    stringstream buffer;
    buffer << t.rdbuf();
    string content = buffer.str();
    unsigned char * buf = (unsigned char *)content.data();
    int buf_size = content.size();
    
    unsigned char xorblock[16];
    memcpy(xorblock, buf, 16);
    unsigned char ciphertext[16];
    for(int i = 1; i < buf_size/16; i++) {
        memcpy(ciphertext, buf + i*16, 16); /* Save the ciphertext */
        aes256_decrypt_ecb(&aesctx, buf + i*16); /* Decrypt content */
        memxor(buf + i*16, xorblock, 16);	   /* Xor to get plaintext */
        memcpy(xorblock, ciphertext, 16);
    }
    ofstream out(file + ".dec");
    out << content.substr(16, string::npos);
    out.close();
}

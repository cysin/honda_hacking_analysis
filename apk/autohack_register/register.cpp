#include <iostream>
#include <string>
#include <vector>
#include <sstream>
#include <algorithm>
#include <iomanip>

using namespace std;

// g++ -std=c++11 register.cpp -o register

int hash_code(const string & str) {
    int h = 0;
    for (size_t i = 0; i < str.size(); ++i) {
        h = h * 31 + static_cast<int>(str[i]);
    }
    return h;
}

int main(int argc, char *argv[]) {
    if(argc != 2) {
        cerr << argv[0] << " xx:xx:xx:xx:xx:xx (bluetooth mac address)" << endl;
        return -1;
    }
    string mac = argv[1];
    if(mac.size() != 17) {
        cerr << "mac adress must be in xx:xx:xx:xx:xx:xx format" << endl;
        return -1;
    }
    // to upper
    transform(mac.begin(), mac.end(),mac.begin(), ::toupper); 
    string a = "PREFIX-" + mac;
    int code1 = hash_code(a);
    stringstream stream;
    stream << uppercase << hex << code1;
    string ahex = stream.str();
    cout << setw (20) << "machine code: " << ahex << endl;
    string b = "google.com" + ahex;
    int code2 = hash_code(b);
    int i = (code2 * code2) + (53 / code2) + ((code2 / 4) * 113);
    //int j = 65535 & ((i & 65535) + ((i & -65536) >> 16));
    int j = 65535 & ((i & 65535) + (((i & -65536) & 0xffffffff) >> 16)); // using & 0xffffffff to avoid signed integer overflow
    cout << setw (20) << "registration code: " << uppercase << hex << j << "-XXXX" << endl;
    return 0;
}

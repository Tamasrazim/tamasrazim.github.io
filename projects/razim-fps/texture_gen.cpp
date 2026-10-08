#include <algorithm>
#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <cstdint>
#include <string>

static void w16(unsigned char*p,unsigned v){p[0]=unsigned char(v);p[1]=unsigned char(v>>8);}
static void w32(unsigned char*p,unsigned v){p[0]=unsigned char(v);p[1]=unsigned char(v>>8);p[2]=unsigned char(v>>16);p[3]=unsigned char(v>>24);}
static unsigned h(unsigned x,unsigned y,unsigned s){unsigned n=x*374761393u+y*668265263u+s*2246822519u;n=(n^(n>>13))*1274126177u;n^=n>>16;return n;}
int main(int argc,char**argv){
 const std::string out=argc>1?argv[1]:"assets/textures";const int W=500,H=500,row=1500,size=750054;
 const int pal[10][3]={{20,34,44},{28,46,58},{58,62,70},{96,55,38},{25,78,72},{55,42,92},{72,44,48},{38,72,92},{88,76,42},{74,74,80}};
 for(int id=1;id<=28;id++){std::vector<unsigned char>b(size);b[0]='B';b[1]='M';w32(&b[2],size);w32(&b[10],54);w32(&b[14],40);w32(&b[18],W);w32(&b[22],H);w16(&b[26],1);w16(&b[28],24);w32(&b[34],750000);
  int mode=(id-1)%8;for(int y=0;y<H;y++)for(int x=0;x<W;x++){unsigned n=h(x>>2,y>>2,id);int r=pal[(id-1)%10][0]+int((n&255)*.08),g=pal[(id-1)%10][1]+int(((n>>8)&255)*.08),bl=pal[(id-1)%10][2]+int(((n>>16)&255)*.08);bool line=false,hot=false;
   if(mode==0)line=x%64<2||y%64<2,hot=x%128<3;if(mode==1)line=(x+y)%72<4,hot=(x+y)%144<4;if(mode==2)line=x%64<3||y%64<3,hot=x%128<3;if(mode==3)line=x%80<4||y%80<4,hot=(x%160<3&&y%50<30);
   if(mode==4)line=((x/40+y/40)%2)==0,hot=x%100<3||y%100<3;if(mode==5)line=((x+y)/18)%2==0,hot=(x+y)%90<3;if(mode==6){double d=std::hypot(x-250,y-250);line=std::fmod(d,52)<3;hot=std::abs(d-150)<3;}if(mode==7)line=std::abs(x-250)<3||std::abs(y-250)<3,hot=x%100<3||y%100<3;
   if(line)r+=38,g+=42,bl+=50;if(hot)r+=55,g+=65,bl+=75;r=std::min(255,r);g=std::min(255,g);bl=std::min(255,bl);size_t p=54+(H-1-y)*row+x*3;b[p]=unsigned char(bl);b[p+1]=unsigned char(g);b[p+2]=unsigned char(r);}
  char name[256];std::snprintf(name,sizeof(name),"%s/vault_%02d.bmp",out.c_str(),id);FILE*f=std::fopen(name,"wb");if(!f)return 2;std::fwrite(b.data(),1,b.size(),f);std::fclose(f);}
 std::puts("NEON VAULT texture bank: 28 textures generated.");return 0;}
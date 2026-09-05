#include <stdio.h>
#include "Challenge.h"
#include <math.h>

/*
 * P06Challenge1
 * Algoritmo não optimizado
 */

void P06Challenge1  (float *Cube, float *Res, int n) {
  int x, y, z;

  for (x = 0; x < n; ++x) {
    Res[x] = 0.f;
  }
  for (y = 0; y < n; ++y) {
    for (z = 0; z < n; ++z) {
      for (x = 0; x < n; ++x) {

	/*
	Res[x] += (Cube[x][y][z] + 10.f) / sqrtf(sqrtfCube[x][y][0]);
	*/	
     	Res[x] += (Cube[x*n*n + y*n + z] + 10.f) / sqrtf (Cube[x*n*n+y*n]);
      }
    }
  }
}


/*
 * P06Challenge2
 * Algoritmo 
 */

void P06Challenge2  (float *Cube, float *Res, int n) {
}

/*
 * P06Challenge3
 */

void P06Challenge3    (float *Cube, float *Res, int n) {
}

/*
 * P06Challenge4
 */


void P06Challenge4  (float *Cube, float *Res, int n) {
}



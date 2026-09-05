#include "prod.h"

/*
 * prod1
 * Algoritmo não optimizado
 */

float prod1  (float *arr, int n) {
	int i;
        float prod=1.f;

	for (i = 0; i < n; ++i) {
		prod *= arr[i]; 
	}
	return prod;
}

/*
 * prod2
 */

float prod2  (float *arr, int n) {
	int i;
        float prod=1.f;

	return prod;
}

/*
 * prod3
 */

float prod3  (float *arr, int n) {
	int i;
        float prod[2]={1.f,1.f}, prodf;

	return prodf;
}

/*
 * prod4
 */

float prod4  (float *arr, int n) {
	int i;
        float prod[4]={1.f,1.f,1.f,1.f}, prodf;

	return prodf;
}



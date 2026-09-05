#include<stdio.h>
#include<stdlib.h>

#ifndef N
#define N 512
#endif

double *A, *B, *C;

void alloc() {
    A = (double *) malloc(N*N*sizeof(double));
    B = (double *) malloc(N*N*sizeof(double));
    C = (double *) malloc(N*N*sizeof(double));
}

void init() {
    for(int i=0; i<N; i++) {
        for(int j=0; j<N; j++) {
            A[i*N+j] = rand();
            B[i*N+j] = rand();
            C[i*N+j] = 0;
        }
    }
}

void mmult() {
    for(int i=0; i<N; i++) {
        for(int j=0; j<N; j++) {
            for(int k=0; k<N; k++) {
                C[i*N+j] += A[i*N+k] * B[k*N+j];
            }
        }
    }
}

int main() {
    alloc();
    init();
    
    mmult();

    printf("%f\n", C[N/2+5]);
}

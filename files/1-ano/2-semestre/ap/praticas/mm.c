#include<stdio.h>
#include<stdlib.h>
#include<omp.h>

#ifndef N
#define N 1024
#endif


double A[N][N], B[N][N], C[N][N];


void init() {
    for(int i=0; i<N; i++) {
        for(int j=0; j<N; j++) {
            A[i][j] = rand();
            B[i][j] = rand();
            C[i][j] = 0;
        }
    }
}

void mmult() {
    for(int i=0; i<N; i++) {
        for(int j=0; j<N; j++) {
            for(int k=0; k<N; k++) {
                C[i][j] += A[i][k] * B[k][j];
            }
        }
    }
}

double MFlops(double time) {
    return(2.0*N*N*N/(time*1000000000.0));
}

int main() {
    init();
   
    double starttime = omp_get_wtime();
    mmult(); 
    double walltime = omp_get_wtime()-starttime;

    printf("%f Time=%f; %f GFlop/s\n", C[N/2][5],walltime, MFlops(walltime));
}


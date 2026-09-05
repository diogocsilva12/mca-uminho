#include <stdio.h>
#include <stdlib.h>
#include  <omp.h>

#define size 4000
#define iter 100

double domain[size][size];
double aux[size][size];

inline void stencil(double in[size][size], double out[size][size], int i, int j) {
    out[i][j]= 0.25 * (in[i-1][j]+in[i+1][j]+in[i][j-1]+in[i][j+1]);    
}

void jacobi(double a[size][size]){
    
    for(int k=0; k<iter; k++) {
	    
        for(int i=1; i<size-1; i++) {
            for(int j=1; j<size-1; j++) {
                stencil(a,aux,i,j);
            }
        }
        
        for(int i=1; i<size-1; i++) {
            for(int j=1; j<size-1; j++) {
                stencil(aux,a,i,j);
            }
        }
        
    }

}

double GFlops(double time) {
    
    return(4.0*(size-2.0)*(size-2.0)*iter/(time*1000000000.0));
}

int main(int argc, char * argv[]) {
    
    double starttime = omp_get_wtime();
    
    jacobi(domain);
    
    double walltime = omp_get_wtime()-starttime;
    printf("F=%lf %lf; %.0lf GFlop/s\n",domain[10][10],walltime, GFlops(walltime) );
    
    return 0;
}


#include <stdio.h>
#include <stdlib.h>
#include <math.h>
#include <omp.h>

#define size 1024
#define iter 20000

double domain[size][size];
double aux[size][size];

void init() {
 
    for(int i = 0; i < size; i++) {
        domain[0][i] =  100.0;
        aux[0][i] = 100.0;
    }
    
    for(int i = 1; i < size; i++) {
        for(int j=0; j < size; j++) {
            domain[i][j] = 0.0;
            aux[i][j] = 0.0;
        }
    }
}

double stencil(double in[size][size], int i, int j) {
    return (in[i-1][j]+in[i+1][j]+in[i][j-1]+in[i][j+1]);
}

int jacobi(double a[size][size],double aux[size][size],double err){
    
    double max=1.0;
    int k = 0;
    
    while (k<iter && max>err) {
        max=0;
        
        for(int i=1; i<size-1; i++) {
            for(int j=1; j<size-1; j++) {
                aux[i][j] = 0.25 * stencil(a,i,j);
                double diff = fabs(a[i][j]-aux[i][j]);
                if (diff>max) max=diff;
            }
        }
        k++;
        for(int i=1; i<size-1; i++) {
            for(int j=1; j<size-1; j++) {
                a[i][j] = 0.25 * stencil(aux,i,j);
                double diff = fabs(a[i][j]-aux[i][j]);
                if (diff>max) max=diff;
            }
        }
        k++;
    }
    printf("%d %f\n",k,max);
    return(k);
}

int sor(double a[size][size],double omega,double err) {
    double omega_over_four = omega * 0.25;
    double one_minus_omega = 1.0 - omega;
    double max=1.0;
    int k = 0;
    
    while (k<iter && max>err) {
        max=0;
        
        for(int i=1; i<size-1; i++) {
            for(int j=1; j<size-1; j++) {
                
                double oldval = a[i][j];
                double newval = omega_over_four * stencil(a,i,j) + one_minus_omega * oldval;
                a[i][j] = newval;
                
                double diff = fabs(newval-oldval);
                if (diff>max) max=diff;
            }
        }
        k++;
    }
    printf("%d %f\n",k,max);
    return(k);
}

int sorrb(double a[size][size],double omega,double err) {
    double omega_over_four = omega * 0.25;
    double one_minus_omega = 1.0 - omega;
    double max = 1.0;
    int k = 0;
    
    while (k<iter && max>err) {
        max=0;
        
        int jsw=1;
        for (int ipass=0; ipass<2; ipass++) { // Odd-even ordering
            int lsw=jsw;
            for (int i=1; i<size-1; i++) {
                for (int j=lsw; j<size-1; j+=2) {
                    
                    double oldval = a[i][j];
                    double newval = omega_over_four * stencil(a,i,j) + one_minus_omega * oldval;
                    a[i][j] = newval;
                    
                    double diff = fabs(newval-oldval);
                    if (diff>max) max=diff;
                }
                lsw=3-lsw;
            }
            jsw=3-jsw;
        }
        k++;
     }
    printf("%d %f\n",k,max);
    return(k);
}


double GFlops(double time,int op, int it) {
    return(4.0*(size-2.0)*(size-2.0)*it/(time*1000000000.0));
}

int main(int argc, char * argv[]) {
    
    int iters;
    double starttime, walltime;
    
    starttime  = omp_get_wtime();
    init(); iters=jacobi(domain,aux,0.01);
    walltime = omp_get_wtime()-starttime;
    printf("F=%lf %lf; %.1lf GFlop/s\n",domain[10][10],walltime, GFlops(walltime,5,iters) );
    
    starttime  = omp_get_wtime();
    init(); iters=sor(domain,1.95,0.01);
    walltime = omp_get_wtime()-starttime;
    printf("F=%lf %lf; %.1lf GFlop/s\n",domain[10][10],walltime, GFlops(walltime,7,iters) );
    
    starttime  = omp_get_wtime();
    init(); iters=sorrb(domain,1.95,0.01);
    walltime = omp_get_wtime()-starttime;
    printf("F=%lf %lf; %.1lf GFlop/s\n",domain[10][10],walltime, GFlops(walltime,7,iters) );
    
    return 0;
}


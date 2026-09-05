#include <stdio.h>
#include <stdlib.h>

#define N 30   // Number of equations

int main() {
    int i, j, k;
    float A[N][N+1], x[N], factor;

    for(i = 0; i < N; i++)
        for(j = 0; j < N+1; j++)
            A[i][j] = rand();

    // Forward Elimination
    for(i = 0; i < N-1; i++) {
        for(j = i+1; j < N; j++) {
            factor = A[j][i] / A[i][i];

            for(k = i; k < N+1; k++) {
                A[j][k] -= factor * A[i][k];
            }
        }
    }

    // Back Substitution
    for(i = N-1; i >= 0; i--) {
        x[i] = A[i][N];

        for(j = i+1; j < N; j++) {
            x[i] -= A[i][j] * x[j];
        }

        x[i] /= A[i][i];
    }

    // Print Solution
    printf("\nSolution:\n");
    for(i = 0; i < N; i++) {
        printf("x%d = %.3f\n", i, x[i]);
    }

    return 0;
}

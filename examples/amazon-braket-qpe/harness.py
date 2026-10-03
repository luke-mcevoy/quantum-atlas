# Use Braket SDK Cost Tracking to estimate the cost to run this example
from braket.tracking import Tracker

t = Tracker().start()
# general imports
import matplotlib.pyplot as plt
import numpy as np

# magic word for producing visualizations in notebook
# %matplotlib inline
# AWS imports: Import Amazon Braket SDK modules
from braket.circuits import Circuit
from braket.devices import LocalSimulator
# local imports
from utils_qpe import run_qpe

# %load_ext autoreload
# %autoreload 2
# set up device: local simulator or the on-demand simulator
device = LocalSimulator()
# device = AwsDevice(Devices.Amazon.SV1)
# Define Pauli matrices
Id = np.eye(2)  # Identity matrix
X = np.array([[0.0, 1.0], [1.0, 0.0]])  # Pauli X
Y = np.array([[0.0, -1.0j], [1.0j, 0.0]])  # Pauli Y
Z = np.array([[1.0, 0.0], [0.0, -1.0]])  # Pauli Z
# set total number of qubits
precision_qubits = [0, 1]
query_qubits = [2]

# prepare query register
my_qpe_circ = Circuit().h(query_qubits)

# set unitary
unitary = X

# show small QPE example circuit
my_qpe_circ = my_qpe_circ.qpe(precision_qubits, query_qubits, unitary)
print("QPE CIRCUIT:")
print(my_qpe_circ)
# set qubits
precision_qubits = [1, 3]
query_qubits = [5]

# prepare query register
my_qpe_circ = Circuit().i(range(7))
my_qpe_circ.h(query_qubits)

# set unitary
unitary = X

# show small QPE example circuit
my_qpe_circ = my_qpe_circ.qpe(precision_qubits, query_qubits, unitary)
print("QPE CIRCUIT:")
print(my_qpe_circ)
# set qubits
precision_qubits = [1, 3]
query_qubits = [5]

# prepare query register
my_qpe_circ = Circuit().i(range(7))
my_qpe_circ.h(query_qubits)

# set unitary
unitary = X

# show small QPE example circuit
my_qpe_circ = my_qpe_circ.qpe(precision_qubits, query_qubits, unitary, control_unitary=False)
print("QPE CIRCUIT:")
print(my_qpe_circ)
def postprocess_qpe_results(out):
    """Function to postprocess dictionary returned by run_qpe

    Args:
        out: dictionary containing results/information associated with QPE run as produced by run_qpe

    """
    # unpack results
    circ = out["circuit"]
    measurement_counts = out["measurement_counts"]
    bitstring_keys = out["bitstring_keys"]
    probs_values = out["probs_values"]
    precision_results_dic = out["precision_results_dic"]
    phases_decimal = out["phases_decimal"]
    eigenvalues = out["eigenvalues"]

    # print the circuit
    print("Printing circuit:")
    print(circ)

    # print measurement results
    print("Measurement counts:", measurement_counts)

    # plot probabalities
    plt.bar(bitstring_keys, probs_values)
    plt.xlabel("bitstrings")
    plt.ylabel("probability")
    plt.xticks(rotation=90)
    # print results
    print("Results in precision register:", precision_results_dic)
    print("QPE phase estimates:", phases_decimal)
    print("QPE eigenvalue estimates:", np.round(eigenvalues, 5))
# Set total number of precision qubits: 2
number_precision_qubits = 2

# Define the set of precision qubits
precision_qubits = range(number_precision_qubits)

# Define the query qubits. We'll have them start after the precision qubits
query_qubits = [number_precision_qubits]

# State preparation for eigenstate of U=X
query = Circuit().h(query_qubits)

# Run the test with U=X
out = run_qpe(X, precision_qubits, query_qubits, query, device)

# Postprocess results
postprocess_qpe_results(out)
# Set total number of precision qubits: 3
number_precision_qubits = 3

# Define the set of precision qubits
precision_qubits = range(number_precision_qubits)

# Define the query qubits. We'll have them start after the precision qubits
query_qubits = [number_precision_qubits]

# State preparation for eigenstate of U=X
query = Circuit().h(query_qubits)

# Run the test with U=X
out = run_qpe(X, precision_qubits, query_qubits, query, device)

# Postprocess results
postprocess_qpe_results(out)
# Set total number of precision qubits: 2
number_precision_qubits = 2

# Define the set of precision qubits
precision_qubits = range(number_precision_qubits)

# Define the query qubits. We'll have them start after the precision qubits
query_qubits = [number_precision_qubits]

# State preparation for eigenstate of U=X
query = Circuit().x(query_qubits).h(query_qubits)

# Run the test with U=X
out = run_qpe(X, precision_qubits, query_qubits, query, device)

# Postprocess results
postprocess_qpe_results(out)
# Set total number of precision qubits: 2
number_precision_qubits = 2

# Define the set of precision qubits
precision_qubits = range(number_precision_qubits)

# Define the query qubits. We'll have them start after the precision qubits
query_qubits = [number_precision_qubits]

# State preparation for |1>, which is not an eigenstate of U=X
query = Circuit().x(query_qubits)

# Run the test with U=X
out = run_qpe(X, precision_qubits, query_qubits, query, device, items_to_keep=2)

# Postprocess results
postprocess_qpe_results(out)
# set unitary matrix U
u1 = np.kron(X, Id)
u2 = np.kron(Id, Z)
unitary = np.dot(u1, u2)
print("Two-qubit unitary (XZ):\n", unitary)

# get example eigensystem
eig_values, eig_vectors = np.linalg.eig(unitary)
print("Eigenvalues:", eig_values)
# print('Eigenvectors:', eig_vectors)
# Set total number of precision qubits: 2
number_precision_qubits = 2

# Define the set of precision qubits
precision_qubits = range(number_precision_qubits)

# Define the query qubits. We'll have them start after the precision qubits
query_qubits = [number_precision_qubits, number_precision_qubits + 1]

# State preparation for eigenstate |+,1> of U=X \otimes Z
query = Circuit().h(query_qubits[0]).x(query_qubits[1])

# Run the test with U=X
out = run_qpe(unitary, precision_qubits, query_qubits, query, device)

# Postprocess results
postprocess_qpe_results(out)
# Generate a random 2 qubit unitary matrix:
from scipy.stats import unitary_group

# Fix random seed for reproducibility
np.random.seed(seed=42)

# Get random two-qubit unitary
random_unitary = unitary_group.rvs(2**2)

# Let's diagonalize this
evals = np.linalg.eig(random_unitary)[0]

# Since we want to be able to read off the eigenvalues of the unitary in question
# let's choose our unitary to be diagonal in this basis
unitary = np.diag(evals)

# Check that this is indeed unitary, and print it out:
print("Two-qubit random unitary:\n", np.round(unitary, 3))
print("Check for unitarity: ", np.allclose(np.eye(len(unitary)), unitary.dot(unitary.T.conj())))

# Print eigenvalues
print("Eigenvalues:", np.round(evals, 3))
print("Target eigenvalue:", np.round(evals[-1], 3))
# Set total number of precision qubits
number_precision_qubits = 3

# Define the set of precision qubits
precision_qubits = range(number_precision_qubits)

# Define the query qubits. We'll have them start after the precision qubits
query_qubits = [number_precision_qubits, number_precision_qubits + 1]

# State preparation for eigenstate |1,1> of diagonal U
query = Circuit().x(query_qubits[0]).x(query_qubits[1])

# Run the test with U=X
out = run_qpe(unitary, precision_qubits, query_qubits, query, device)

# Postprocess results
postprocess_qpe_results(out)

# compare output to exact target values
print("Target eigenvalue:", np.round(evals[-1], 3))
# Set total number of precision qubits
number_precision_qubits = 10

# Define the set of precision qubits
precision_qubits = range(number_precision_qubits)

# Define the query qubits. We'll have them start after the precision qubits
query_qubits = [number_precision_qubits, number_precision_qubits + 1]

# State preparation for eigenstate |1,1> of diagonal U
query = Circuit().x(query_qubits[0]).x(query_qubits[1])

# Run the test with U=X
out = run_qpe(unitary, precision_qubits, query_qubits, query, device)

# Postprocess results
eigenvalues = out["eigenvalues"]
print("QPE eigenvalue estimates:", np.round(eigenvalues, 5))

# compare output to exact target values
print("Target eigenvalue:", np.round(evals[-1], 5))
print("Quantum Task Summary")
print(t.quantum_tasks_statistics())
print(
    "Note: Charges shown are estimates based on your Amazon Braket simulator and quantum processing unit (QPU) task usage. Estimated charges shown may differ from your actual charges. Estimated charges do not factor in any discounts or credits, and you may experience additional charges based on your use of other services such as Amazon Elastic Compute Cloud (Amazon EC2).",
)
print(
    f"Estimated cost to run this example: {t.qpu_tasks_cost() + t.simulator_tasks_cost():.2f} USD",
)
